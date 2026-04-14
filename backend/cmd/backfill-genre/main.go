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
	"log"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/Koseeee-27/podlog/backend/internal/config"
	"github.com/Koseeee-27/podlog/backend/internal/external/itunes"
	"github.com/Koseeee-27/podlog/backend/internal/repository"

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

	// 3. リポジトリと iTunes クライアントを初期化
	podcastRepo := repository.NewPodcastRepository(db)
	itunesClient := itunes.NewClient()

	// 4. バッチ処理を実行
	if err := run(podcastRepo, itunesClient); err != nil {
		log.Fatalf("バッチ処理に失敗: %v", err)
	}
}

// run はバッチ処理のメインロジックです。
// テストしやすいように main() から分離しています。
func run(podcastRepo repository.PodcastRepository, itunesClient *itunes.Client) error {
	ctx := context.Background()

	// 1. genre が NULL のポッドキャストを取得
	podcasts, err := podcastRepo.ListWithoutGenre(ctx)
	if err != nil {
		return fmt.Errorf("ジャンル未設定の番組一覧取得に失敗: %w", err)
	}

	if len(podcasts) == 0 {
		log.Println("ジャンル未設定の番組はありません。処理を終了します。")
		return nil
	}

	log.Printf("ジャンル未設定の番組: %d 件", len(podcasts))

	// 2. 各番組に対して iTunes API でジャンルを取得して更新
	var successCount, skipCount, failCount int

	for i, podcast := range podcasts {
		// itunes_id が nil の場合はスキップ（ListWithoutGenre の条件で排除されるはずだが安全のため）
		if podcast.ItunesID == nil {
			log.Printf("[%d/%d] %s: itunes_id が未設定のためスキップ", i+1, len(podcasts), podcast.Title)
			skipCount++
			continue
		}

		itunesID := *podcast.ItunesID
		log.Printf("[%d/%d] %s (iTunes ID: %d) のジャンルを取得中...", i+1, len(podcasts), podcast.Title, itunesID)

		// iTunes Lookup API でジャンル情報を取得
		result, err := itunesClient.LookupByID(ctx, itunesID)
		if err != nil {
			log.Printf("  -> iTunes API エラー: %v", err)
			failCount++
			// エラーでも処理を続行（1件の失敗で全体を止めない）
			time.Sleep(200 * time.Millisecond)
			continue
		}

		if result == nil {
			log.Printf("  -> iTunes API で見つかりませんでした")
			skipCount++
			time.Sleep(200 * time.Millisecond)
			continue
		}

		if result.PrimaryGenre == "" {
			log.Printf("  -> ジャンル情報が空でした")
			skipCount++
			time.Sleep(200 * time.Millisecond)
			continue
		}

		// DB のジャンルを更新
		if err := podcastRepo.UpdateGenre(ctx, podcast.ID, result.PrimaryGenre); err != nil {
			log.Printf("  -> DB 更新エラー: %v", err)
			failCount++
			time.Sleep(200 * time.Millisecond)
			continue
		}

		log.Printf("  -> ジャンルを「%s」に更新しました", result.PrimaryGenre)
		successCount++

		// iTunes API のレートリミットを考慮して 200ms 待つ
		// Apple の公式ドキュメントでは明確なリミットは公開されていないが、
		// 短時間に大量のリクエストを送ると 403 が返ることがあるため、間隔を空ける
		time.Sleep(200 * time.Millisecond)
	}

	log.Println("---- バッチ処理完了 ----")
	log.Printf("成功: %d 件, スキップ: %d 件, 失敗: %d 件", successCount, skipCount, failCount)

	return nil
}
