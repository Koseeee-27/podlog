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
	"log"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/Koseeee-27/podlog/backend/internal/config"
	"github.com/Koseeee-27/podlog/backend/internal/external/rss"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	// 1. 設定を環境変数から読み込み
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("設定の読み込みに失敗: %v", err)
	}

	// 2. DB に接続
	// driver 名は "pgx" を使う。"pgx/v5" だと sqlx の BindType が UNKNOWN を返し
	// NamedExec の ? → $N 変換が効かなくなる (#337)。
	// 詳細は cmd/server/main.go のコメント参照。
	db, err := sqlx.Connect("pgx", cfg.DatabaseDSN())
	if err != nil {
		log.Fatalf("DB 接続に失敗: %v", err)
	}
	defer db.Close()

	log.Println("DB に接続しました")

	// 3. リポジトリとユースケースを初期化
	podcastRepo := repository.NewPodcastRepository(db)
	episodeRepo := repository.NewEpisodeRepository(db)
	rssFetcher := rss.NewClient()
	episodeUC := usecase.NewEpisodeUsecase(episodeRepo, podcastRepo, rssFetcher, nil)

	// 4. バッチ処理を実行
	if err := run(podcastRepo, episodeUC); err != nil {
		log.Fatalf("バッチ処理に失敗: %v", err)
	}
}

// run はバッチ処理のメインロジックです。
// テストしやすいように main() から分離しています。
//
// 引数:
//   - podcastRepo: エピソード未取得の番組一覧を取得するために使う
//   - episodeUC: RSS フィードからエピソードを取得・保存する既存のユースケース（FetchFromFeed）を再利用する
func run(podcastRepo repository.PodcastRepository, episodeUC usecase.EpisodeUsecase) error {
	ctx := context.Background()

	// 1. エピソードが0件のポッドキャストを取得
	podcasts, err := podcastRepo.ListWithoutEpisodes(ctx)
	if err != nil {
		return fmt.Errorf("エピソード未取得の番組一覧取得に失敗: %w", err)
	}

	if len(podcasts) == 0 {
		log.Println("エピソード未取得の番組はありません。処理を終了します。")
		return nil
	}

	log.Printf("エピソード未取得の番組: %d 件", len(podcasts))

	// 2. 各番組の RSS フィードからエピソードを取得して保存
	var successCount, skipCount, failCount int

	for i, podcast := range podcasts {
		// feed_url が nil または空文字の場合はスキップ
		if podcast.FeedURL == nil || *podcast.FeedURL == "" {
			log.Printf("[%d/%d] %s: feed_url が未設定のためスキップ", i+1, len(podcasts), podcast.Title)
			skipCount++
			continue
		}

		feedURL := *podcast.FeedURL
		log.Printf("[%d/%d] %s のエピソードを取得中...", i+1, len(podcasts), podcast.Title)

		// 既存の FetchFromFeed ユースケースを再利用
		// FetchFromFeed は RSS フィードから最新50件を取得し、GUID で重複チェックして DB に保存する
		result, err := episodeUC.FetchFromFeed(ctx, podcast.ID, feedURL)
		if err != nil {
			log.Printf("  -> エラー: %v（スキップして続行）", err)
			failCount++
			// エラーでも処理を続行（1件の失敗で全体を止めない）
			time.Sleep(200 * time.Millisecond)
			continue
		}

		log.Printf("  -> 新規: %d 件, スキップ: %d 件, 失敗: %d 件",
			result.NewCount, result.SkippedCount, result.FailedCount)
		successCount++

		// RSS フィードへのリクエスト間に 200ms 待つ（レートリミット対策）
		// 短時間に大量のリクエストを送ると、フィード提供元のサーバーに負荷がかかるため間隔を空ける
		time.Sleep(200 * time.Millisecond)
	}

	log.Println("---- バッチ処理完了 ----")
	log.Printf("成功: %d 件, スキップ: %d 件, 失敗: %d 件", successCount, skipCount, failCount)

	return nil
}
