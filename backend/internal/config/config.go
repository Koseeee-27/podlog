// Package config は環境変数からアプリケーション設定を読み込みます。
// caarlos0/env ライブラリを使って、構造体のタグから自動的に環境変数をマッピングします。
package config

import (
	"fmt"
	"net/url"

	"github.com/caarlos0/env/v11"
)

// Config はアプリケーション全体の設定を保持する構造体です。
// `env` タグで対応する環境変数名を指定し、`envDefault` でデフォルト値を設定します。
type Config struct {
	// サーバー設定
	Port string `env:"PORT" envDefault:"8080"`

	// データベース設定（個別パラメータ）
	// パスワードに @ や : 等の特殊文字が含まれても安全に接続できるよう、
	// DSN 文字列ではなく個別の環境変数で受け取り、DatabaseDSN() で組み立てる。
	DBHost     string `env:"DB_HOST" envDefault:"localhost"`
	DBPort     string `env:"DB_PORT" envDefault:"5432"`
	DBUser     string `env:"DB_USER" envDefault:"postgres"`
	DBPassword string `env:"DB_PASSWORD" envDefault:"postgres"`
	DBName     string `env:"DB_NAME" envDefault:"podlog"`
	DBSSLMode  string `env:"DB_SSLMODE" envDefault:"disable"`

	// Supabase 設定
	// Supabase プロジェクトURL（例: https://xxx.supabase.co）
	// JWKS エンドポイント（/.well-known/jwks.json）から公開鍵を取得して JWT を検証する
	SupabaseURL string `env:"SUPABASE_URL" envDefault:""`

	// Supabase サービスロールキー（Storage API へのアクセスに使用）
	// サーバーサイドからのみ使用し、フロントエンドには公開しない
	SupabaseServiceKey string `env:"SUPABASE_SERVICE_KEY" envDefault:""`

	// CORS 設定
	CORSAllowOrigins string `env:"CORS_ALLOW_ORIGINS" envDefault:"http://localhost:3000"`

	// 環境 (development / production)
	Environment string `env:"APP_ENV" envDefault:"development"`
}

// DatabaseDSN はデータベース接続用の DSN 文字列を組み立てます。
// net/url.UserPassword を使用してユーザー名・パスワードを安全にエスケープするため、
// パスワードに @, :, / 等の URL 予約文字が含まれていても正しく動作します。
func (c *Config) DatabaseDSN() string {
	u := &url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(c.DBUser, c.DBPassword),
		Host:     fmt.Sprintf("%s:%s", c.DBHost, c.DBPort),
		Path:     "/" + c.DBName,
		RawQuery: fmt.Sprintf("sslmode=%s", url.QueryEscape(c.DBSSLMode)),
	}
	return u.String()
}

// Validate は必須の設定値が正しくセットされているかチェックします。
// 未設定の場合はどの環境変数が足りないかを明示したエラーを返します。
func (c *Config) Validate() error {
	var missing []string

	if c.SupabaseURL == "" {
		missing = append(missing, "SUPABASE_URL")
	}

	if len(missing) > 0 {
		return fmt.Errorf(
			"必須の環境変数が設定されていません: %s\n"+
				"  → .env.example を参考に .env ファイルを作成してください:\n"+
				"    cp .env.example .env\n"+
				"  → SUPABASE_URL は Supabase ダッシュボード → Settings → API → Project URL から取得できます",
			fmt.Sprintf("%v", missing),
		)
	}

	return nil
}

// Load は環境変数から Config を読み込みます。
// env.Parse が構造体の `env` タグを読み取り、対応する環境変数の値をセットします。
// 読み込み後に Validate() で必須値のチェックも行います。
func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}
