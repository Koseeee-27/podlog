// Package main は既存のポッドキャストにエピソードを一括取得するバッチツールです。
//
// 対象: feed_url が NOT NULL かつ episodes テーブルにエピソードが0件のポッドキャスト
//
// 処理の流れ:
//  1. DB からエピソードが0件のポッドキャストを一覧取得
//  2. 各ポッドキャストの RSS フィードから最新50件のエピソードを取得
//  3. エピソードを DB に保存
//  4. RSS フィードへのリクエスト間に 200ms の間隔を入れる（レートリミット対策）
//
// 使い方:
//
//	go run ./cmd/backfill-episodes/
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
	"github.com/Koseeee-27/podlog/backend/internal/external/rss"
	"github.com/Koseeee-27/podlog/backend/internal/logging"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// main は run() を呼び出し、エラーがあればログ出力して終了するだけの薄い関数。
// os.Exit() は main() でのみ呼ぶことで、他の関数内の defer が確実に実行される。
// （slog には Fatal がないため、エラーを返してから main() で os.Exit する）
func main() {
	if err := run(); err != nil {
		slog.Error("backfill-episodes failed", "error", err)
		os.Exit(1)
	}
}

// run はバッチ処理全体のオーケストレーション（設定読込・DB 接続・後片付け）を担う。
// 致命エラーは return でエラーを返し、main() で os.Exit(1) させる。
// こうすることで defer db.Close() が確実に実行される。
func run() error {
	// 0a. ロガーを暫定初期化（本番相当の JSON Handler）。
	// config 読み込み失敗時のログも slog に乗せるため、ここで先に SetDefault する。
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

	// 3. リポジトリとユースケースを初期化
	podcastRepo := repository.NewPodcastRepository(db)
	episodeRepo := repository.NewEpisodeRepository(db)
	rssFetcher := rss.NewClient()
	episodeUC := usecase.NewEpisodeUsecase(episodeRepo, podcastRepo, rssFetcher, nil)

	// 4. バッチ処理を実行
	if err := backfill(podcastRepo, episodeUC); err != nil {
		return fmt.Errorf("backfill process failed: %w", err)
	}
	return nil
}

// backfill はバッチ処理のメインロジックです。
// テストしやすいように main() / run() から分離しています。
//
// 引数:
//   - podcastRepo: エピソード未取得の番組一覧を取得するために使う
//   - episodeUC: RSS フィードからエピソードを取得・保存する既存のユースケース（FetchFromFeed）を再利用する
func backfill(podcastRepo repository.PodcastRepository, episodeUC usecase.EpisodeUsecase) error {
	ctx := context.Background()

	// 1. エピソードが0件のポッドキャストを取得
	podcasts, err := podcastRepo.ListWithoutEpisodes(ctx)
	if err != nil {
		return fmt.Errorf("failed to list podcasts without episodes: %w", err)
	}

	if len(podcasts) == 0 {
		slog.Info("no podcasts without episodes; exiting")
		return nil
	}

	slog.Info("found podcasts without episodes", "total", len(podcasts))

	// 2. 各番組の RSS フィードからエピソードを取得して保存
	var successCount, skipCount, failCount int

	for i, podcast := range podcasts {
		// feed_url が nil または空文字の場合はスキップ
		if podcast.FeedURL == nil || *podcast.FeedURL == "" {
			slog.Warn("skipping podcast without feed_url",
				"index", i+1,
				"total", len(podcasts),
				"title", podcast.Title,
			)
			skipCount++
			continue
		}

		feedURL := *podcast.FeedURL
		slog.Info("fetching episodes from feed",
			"index", i+1,
			"total", len(podcasts),
			"title", podcast.Title,
		)

		// 既存の FetchFromFeed ユースケースを再利用
		// FetchFromFeed は RSS フィードから最新50件を取得し、GUID で重複チェックして DB に保存する
		result, err := episodeUC.FetchFromFeed(ctx, podcast.ID, feedURL)
		if err != nil {
			// 1 件の失敗で全体を止めないため、WARN にして continue する
			// （ERROR にすると Cloud Error Reporting に通知されてしまう）
			slog.Warn("failed to fetch episodes; skipping and continuing",
				"index", i+1,
				"title", podcast.Title,
				"error", err,
			)
			failCount++
			// エラーでも処理を続行（1件の失敗で全体を止めない）
			time.Sleep(200 * time.Millisecond)
			continue
		}

		slog.Info("fetched episodes",
			"index", i+1,
			"title", podcast.Title,
			"new", result.NewCount,
			"skipped", result.SkippedCount,
			"failed", result.FailedCount,
		)
		successCount++

		// RSS フィードへのリクエスト間に 200ms 待つ（レートリミット対策）
		// 短時間に大量のリクエストを送ると、フィード提供元のサーバーに負荷がかかるため間隔を空ける
		time.Sleep(200 * time.Millisecond)
	}

	slog.Info("backfill-episodes completed",
		"success", successCount,
		"skip", skipCount,
		"fail", failCount,
	)

	return nil
}
