package middleware

import (
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// CORS は Cross-Origin Resource Sharing のミドルウェアを設定します。
//
// CORS とは:
// ブラウザはセキュリティのため、異なるオリジン（ドメイン）へのリクエストを制限します。
// フロントエンド (localhost:3000) からバックエンド (localhost:8080) へリクエストするには、
// バックエンドが「このオリジンからのリクエストを許可する」と応答する必要があります。
//
// allowOrigins はカンマ区切りの許可オリジン文字列（例: "http://localhost:3000,https://podlog.app"）
func CORS(allowOrigins string) echo.MiddlewareFunc {
	parts := strings.Split(allowOrigins, ",")
	origins := make([]string, 0, len(parts))
	for _, o := range parts {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	return middleware.CORSWithConfig(middleware.CORSConfig{
		// 許可するオリジン（フロントエンドのURL）
		AllowOrigins: origins,
		// 許可するHTTPメソッド
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		// 許可するリクエストヘッダー
		AllowHeaders: []string{"Accept", "Authorization", "Content-Type"},
		// ブラウザがレスポンスから読み取れるヘッダー
		ExposeHeaders: []string{"Content-Length"},
		// Cookieなどの認証情報を含むリクエストを許可
		AllowCredentials: true,
		// プリフライトリクエスト（OPTIONS）のキャッシュ時間（秒）
		MaxAge: 3600,
	})
}
