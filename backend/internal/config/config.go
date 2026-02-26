// Package config は環境変数からアプリケーション設定を読み込みます。
// caarlos0/env ライブラリを使って、構造体のタグから自動的に環境変数をマッピングします。
package config

import (
	"fmt"

	"github.com/caarlos0/env/v11"
)

// Config はアプリケーション全体の設定を保持する構造体です。
// `env` タグで対応する環境変数名を指定し、`envDefault` でデフォルト値を設定します。
type Config struct {
	// サーバー設定
	Port string `env:"PORT" envDefault:"8080"`

	// データベース設定
	DatabaseURL string `env:"DATABASE_URL" envDefault:"postgres://postgres:postgres@localhost:5432/podlog?sslmode=disable"`

	// Supabase 設定
	// Supabase プロジェクトURL（例: https://xxx.supabase.co）
	// JWKS エンドポイント（/.well-known/jwks.json）から公開鍵を取得して JWT を検証する
	SupabaseURL string `env:"SUPABASE_URL" envDefault:""`

	// CORS 設定
	CORSAllowOrigins string `env:"CORS_ALLOW_ORIGINS" envDefault:"http://localhost:3000"`

	// 環境 (development / production)
	Environment string `env:"APP_ENV" envDefault:"development"`
}

// Load は環境変数から Config を読み込みます。
// env.Parse が構造体の `env` タグを読み取り、対応する環境変数の値をセットします。
func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}
	return cfg, nil
}
