// Package main は make migrate-up / make migrate-down から呼ばれる
// マイグレーション専用の CLI ツールです。
//
// サーバー本体（cmd/server）の起動時にも自動マイグレーション（Up）が走るが、
// ローカルで Down を試したい・本番デプロイ前に手動で確認したい等のユースケースに対応する。
//
// 使い方:
//
//	go run ./cmd/migrate up      # 未適用のマイグレーションを全て適用
//	go run ./cmd/migrate down    # 直近 1 ステップだけロールバック（再実行で連続巻き戻し）
//
// DB 接続情報は cmd/server と同じ環境変数（DB_HOST / DB_PORT / DB_USER / DB_PASSWORD /
// DB_NAME / DB_SSLMODE）を使う。.env ファイルは cwd（backend/）から読み込む。
package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"

	dbmigrate "github.com/Koseeee-27/podlog/backend/db"
	"github.com/Koseeee-27/podlog/backend/internal/config"
)

func main() {
	if err := run(); err != nil {
		// エラー出力は stderr に出してから exit code 1 で終了する。
		// os.Exit を main で呼ぶことで、defer のスキップを最小化する。
		slog.Error("migrate command failed", "error", err)
		os.Exit(1)
	}
}

// run は引数を解釈してマイグレーションコマンドを実行します。
// テスト容易性のため main から分離している。
func run() error {
	// .env が存在すれば読み込む（存在しなければ無視）。
	// 環境変数で直接渡されている場合（CI 等）は .env なしで動く。
	_ = godotenv.Load()

	// 環境変数を Config 構造体にマッピング。cmd/server と同じ仕組みを再利用する。
	cfg := &config.Config{}
	if err := env.Parse(cfg); err != nil {
		return fmt.Errorf("環境変数の読み込みに失敗: %w", err)
	}
	dsn := cfg.DatabaseDSN()

	// サブコマンド形式: go run ./cmd/migrate <up|down>
	// os.Args[0] は実行ファイル名、os.Args[1] が最初の引数。
	if len(os.Args) < 2 {
		return fmt.Errorf("使い方: migrate <up|down>")
	}
	cmd := os.Args[1]

	switch cmd {
	case "up":
		// 未適用の全マイグレーションを適用（cmd/server の起動時と同じ動作）。
		return dbmigrate.RunMigrations(dsn)
	case "down":
		// 直近 1 ステップだけロールバック。
		// 連続して巻き戻したい場合は make migrate-down を複数回叩く運用にする
		// （誤操作で本番 DB を空にする事故を防ぐため、明示的に複数回叩かせる設計）。
		return dbmigrate.RollbackMigration(dsn)
	default:
		return fmt.Errorf("未知のサブコマンド: %q (up または down を指定してください)", cmd)
	}
}
