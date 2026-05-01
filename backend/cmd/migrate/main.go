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

	"github.com/joho/godotenv"

	dbmigrate "github.com/Koseeee-27/podlog/backend/db"
	"github.com/Koseeee-27/podlog/backend/internal/config"
	"github.com/Koseeee-27/podlog/backend/internal/logging"
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
//
// 初期化パターンは cmd/server / cmd/backfill-* と揃える:
//  1. 暫定ロガー（本番 JSON Handler）を SetDefault
//  2. .env 読み込み（無ければ無視）
//  3. config.Load() で環境変数をパース
//  4. 環境別ロガーに差し替え
func run() error {
	// 1. ロガーを暫定初期化（本番相当の JSON Handler）。
	// config 読み込み失敗時のログも slog に乗せるため、ここで先に SetDefault する。
	slog.SetDefault(logging.NewLogger(logging.EnvProduction))

	// 2. .env が存在すれば読み込む（無ければ環境変数からそのまま読む）。
	if err := godotenv.Load(); err != nil {
		slog.Info(".env file not found, loading config from environment variables")
	}

	// 3. 環境変数を Config 構造体にロード。cmd/server / cmd/backfill-* と
	// 同じファクトリを使うことで一貫性を保つ。
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// 4. ロガーを環境に応じたものに差し替える（development なら TextHandler）。
	slog.SetDefault(logging.NewLogger(cfg.Environment))

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
