// Package middleware - SitemapAuth は sitemap 用内部 API の Bearer トークン認証を行うミドルウェアです。
package middleware

import (
	"crypto/subtle"
	"log/slog"
	"net/http"

	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/labstack/echo/v4"
)

// SitemapAuth は sitemap 用 API のための Bearer トークン認証ミドルウェアです。
//
// 用途:
//
//	FE（Netlify）の app/sitemap.ts から呼ばれる /sitemap/podcasts 等の内部 API を、
//	事前共有された Bearer トークン（pre-shared token）で保護する。
//	JWT ではなく単純な共有秘密で十分であり、FE と BE の両方に同じ環境変数
//	SITEMAP_API_TOKEN を設定して突合する運用を想定している。
//
// 動作:
//
//   - dev モード（isDev == true）では、トークン検証を行わずそのまま素通しする。
//     ローカル開発では FE 側もヘッダー付与を行わない構成にするため。
//   - 本番モードでは、Authorization ヘッダーから "Bearer <token>" を取り出し、
//     expectedToken と一致するかをタイミング攻撃耐性のある定数時間比較で確認する。
//   - expectedToken が空文字列のときは fail-secure として 401 を返す。
//     誤って本番に空のトークンが設定された場合に、認証を素通りさせないため。
//
// ログ:
//
//   - 検証失敗はクライアント起因なので WARN（ERROR にすると Cloud Error Reporting
//     のノイズ源になる）。
//   - method / path（実パス）/ route（ルートパターン）をログに残し、
//     トークン本体やヘッダー値は残さない（rules/backend.md「絶対 NG ログ」）。
//     path と route の使い分けは rules/backend.md「ログ属性のキー名と値の粒度を
//     統一する」に従う。
//
// 引数:
//   - expectedToken: 期待するトークンの値（環境変数 SITEMAP_API_TOKEN）
//   - isDev: 開発環境かどうか。true なら認証を行わず next にそのまま渡す
func SitemapAuth(expectedToken string, isDev bool) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// 開発環境では FE 側もヘッダー付与を行わないため、middleware は素通しする。
			// 本番と挙動が変わる箇所であることを明示するためにログは出さない（毎リクエスト
			// 出すとノイズになる）。
			if isDev {
				return next(c)
			}

			ctx := c.Request().Context()
			method := c.Request().Method
			path := c.Request().URL.Path
			// route はルートパターン（例: /api/v1/sitemap/podcasts）。
			// path（実パス）と粒度を分けることで、Cloud Logging 上で path フィルタ
			// （実パス指定）と route フィルタ（ハンドラ単位の集計）の両方を打てる。
			// rules/backend.md「ログ属性のキー名と値の粒度を統一する」に従う。
			route := c.Path()

			// 既存の extractBearerToken を再利用（同パッケージ内）。
			// "Bearer <token>" 単体（token 部分が空白のみ）も tokenInvalidFormat で弾かれる。
			token, result := extractBearerToken(c)
			if result != tokenOK {
				// ヘッダー無しもフォーマット不正もまとめて 401。
				// クライアント向けのエラーメッセージを細かく分けても運用上の利点が薄く、
				// 攻撃者に内部状態を伝える表面積を増やすだけなので統一する。
				slog.WarnContext(ctx, "sitemap auth: missing or invalid authorization header",
					"method", method,
					"path", path,
					"route", route,
				)
				return response.Error(c, http.StatusUnauthorized, "unauthorized")
			}

			// fail-secure: 期待トークンが空（設定漏れ）のときは認証を成功させない。
			//
			// 現状は extractBearerToken が空トークン（"Bearer " 等で TrimSpace 後に
			// 空になるケース）を tokenInvalidFormat で弾くため、上の分岐で先に 401
			// になっている。つまり「クライアントが空 + expectedToken も空 →
			// ConstantTimeCompare で一致して素通り」という経路は現状塞がっている。
			//
			// それでも expectedToken == "" を明示的に拒否しているのは、
			// (1) 設定漏れ時に常に 401 を返す（=本番環境で SITEMAP_API_TOKEN 未設定の
			//     誤設定を運用上検知しやすくする）、
			// (2) 将来 extractBearerToken の挙動が変わっても素通りさせない、
			// という防御的なガードとして残しておくため。Validate() 側の起動時必須
			// チェックと合わせた多重防御の一段階。
			//
			// crypto/subtle.ConstantTimeCompare はタイミング攻撃対策のための定数時間比較。
			// 通常の == 演算子だと文字列の先頭から不一致箇所までの実行時間が変わるため、
			// 攻撃者が応答時間からトークンを 1 文字ずつ推測できてしまう（理論上の脅威だが、
			// 認証に関わる比較ではベストプラクティスとして使う）。
			//
			// ConstantTimeCompare の挙動:
			//   - 長さが異なるバイト列が渡された場合は即 0 を返す（タイミング差の話とは独立）。
			//   - 同じ長さの場合のみ全バイトを比較し、定数時間で 0 / 1 を返す。
			// このため「短いトークンを送ると不一致でも短時間で返る」という現象は起きるが、
			// 攻撃者が真のトークンの中身を推測する手がかりにはならない。
			if expectedToken == "" ||
				subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) != 1 {
				slog.WarnContext(ctx, "sitemap auth: token mismatch",
					"method", method,
					"path", path,
					"route", route,
				)
				return response.Error(c, http.StatusUnauthorized, "unauthorized")
			}

			return next(c)
		}
	}
}
