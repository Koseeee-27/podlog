// Package main は既存のポッドキャストにジャンル情報を一括で埋めるバッチツールです。
//
// 対象: genre カラムが NULL かつ itunes_id が NOT NULL のポッドキャスト
//
// 処理の流れ:
//  1. DB から genre が NULL のポッドキャストを一覧取得
//  2. 各ポッドキャストに対して iTunes Lookup API でジャンルを取得
//  3. DB の genre カラムを更新
//  4. iTunes API のレートリミットを考慮し、リクエスト間に 200ms の間隔を入れる
//
// 使い方:
//
//	go run ./cmd/backfill-genre/
//
// 環境変数:
//
//	DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSLMODE
//	（backend/internal/config と同じ環境変数を使用）
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/Koseeee-27/podlog/backend/internal/config"
	"github.com/Koseeee-27/podlog/backend/internal/external/itunes"
	"github.com/Koseeee-27/podlog/backend/internal/logging"
	"github.com/Koseeee-27/podlog/backend/internal/repository"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// main は run() を呼び出し、エラーがあればログ出力して終了するだけの薄い関数。
// os.Exit() は main() でのみ呼ぶことで、他の関数内の defer が確実に実行される。
// （slog には Fatal がないため、エラーを返してから main() で os.Exit する）
func main() {
	if err := run(); err != nil {
		slog.Error("backfill-genre failed", "error", err)
		os.Exit(1)
	}
}

// run はバッチ処理全体のオーケストレーション（設定読込・DB 接続・後片付け）を担う。
// 致命エラーは return でエラーを返し、main() で os.Exit(1) させる。
// こうすることで defer db.Close() が確実に実行される。
func run() error {
	// 0a. ロガーを暫定初期化（本番相当の JSON Handler）。
	// config 読み込み失敗時のログも slog に乗せるため、ここで先に SetDefault する。
	// cfg.Environment が取れ次第、下で環境に応じたロガーに差し替える。
	slog.SetDefault(logging.NewLogger(logging.EnvProduction))

	// 1. 設定を環境変数から読み込み
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// 1.5. ロガーを環境に応じたものに差し替える
	slog.SetDefault(logging.NewLogger(cfg.Environment))

	// 2. DB に接続
	// driver 名は "pgx" を使う。"pgx/v5" だと sqlx の BindType が UNKNOWN を返し
	// NamedExec の ? → $N 変換が効かなくなる (#337)。
	// 詳細は cmd/server/main.go のコメント参照。
	db, err := sqlx.Connect("pgx", cfg.DatabaseDSN())
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer db.Close()

	slog.Info("connected to database successfully")

	// 3. リポジトリと iTunes クライアントを初期化
	podcastRepo := repository.NewPodcastRepository(db)
	itunesClient := itunes.NewClient()

	// 4. バッチ処理を実行
	if err := backfill(podcastRepo, itunesClient); err != nil {
		return fmt.Errorf("backfill process failed: %w", err)
	}
	return nil
}

// backfill はバッチ処理のメインロジックです。
// テストしやすいように main() / run() から分離しています。
func backfill(podcastRepo repository.PodcastRepository, itunesClient *itunes.Client) error {
	ctx := context.Background()

	// 1. genre が NULL のポッドキャストを取得
	podcasts, err := podcastRepo.ListWithoutGenre(ctx)
	if err != nil {
		return fmt.Errorf("failed to list podcasts without genre: %w", err)
	}

	if len(podcasts) == 0 {
		slog.Info("no podcasts without genre; exiting")
		return nil
	}

	slog.Info("found podcasts without genre", "total", len(podcasts))

	// 2. 各番組に対して iTunes API でジャンルを取得して更新
	var successCount, skipCount, failCount int

	for i, podcast := range podcasts {
		// itunes_id が nil の場合はスキップ（ListWithoutGenre の条件で排除されるはずだが安全のため）
		if podcast.ItunesID == nil {
			slog.Warn("skipping podcast without itunes_id",
				"index", i+1,
				"total", len(podcasts),
				"title", podcast.Title,
			)
			skipCount++
			continue
		}

		itunesID := *podcast.ItunesID
		slog.Info("fetching genre from iTunes",
			"index", i+1,
			"total", len(podcasts),
			"title", podcast.Title,
			"itunes_id", itunesID,
		)

		// iTunes Lookup API でジャンル情報を取得
		result, err := itunesClient.LookupByID(ctx, itunesID)
		if err != nil {
			// 1 件の失敗で全体を止めないため、WARN にして continue する
			// （ERROR にすると Cloud Error Reporting に通知されてしまう）
			slog.Warn("iTunes lookup failed",
				"index", i+1,
				"title", podcast.Title,
				"itunes_id", itunesID,
				"error", err,
			)
			failCount++
			// エラーでも処理を続行（1件の失敗で全体を止めない）
			time.Sleep(200 * time.Millisecond)
			continue
		}

		if result == nil {
			slog.Info("iTunes lookup returned no match; skipping",
				"index", i+1,
				"title", podcast.Title,
				"itunes_id", itunesID,
			)
			skipCount++
			time.Sleep(200 * time.Millisecond)
			continue
		}

		if result.PrimaryGenre == "" {
			slog.Info("iTunes returned empty genre; skipping",
				"index", i+1,
				"title", podcast.Title,
				"itunes_id", itunesID,
			)
			skipCount++
			time.Sleep(200 * time.Millisecond)
			continue
		}

		// DB のジャンルを更新
		if err := podcastRepo.UpdateGenre(ctx, podcast.ID, result.PrimaryGenre); err != nil {
			slog.Warn("failed to update genre in database",
				"index", i+1,
				"title", podcast.Title,
				"itunes_id", itunesID,
				"error", err,
			)
			failCount++
			time.Sleep(200 * time.Millisecond)
			continue
		}

		slog.Info("updated podcast genre",
			"index", i+1,
			"title", podcast.Title,
			"genre", result.PrimaryGenre,
		)
		successCount++

		// iTunes API のレートリミットを考慮して 200ms 待つ
		// Apple の公式ドキュメントでは明確なリミットは公開されていないが、
		// 短時間に大量のリクエストを送ると 403 が返ることがあるため、間隔を空ける
		time.Sleep(200 * time.Millisecond)
	}

	slog.Info("backfill-genre completed",
		"success", successCount,
		"skip", skipCount,
		"fail", failCount,
	)

	return nil
}
