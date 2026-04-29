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
//   - method / path（実パス）のみログに残し、トークン本体やヘッダー値は残さない
//     （rules/backend.md「絶対 NG ログ」）。
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

			// 既存の extractBearerToken を再利用（同パッケージ内）。
			// "Bearer <token>" 形式かどうか、空白だけのトークンでないか、
			// 等のフォーマットチェックを共通化している。
			token, result := extractBearerToken(c)
			if result != tokenOK {
				// ヘッダー無しもフォーマット不正もまとめて 401。
				// クライアント向けのエラーメッセージを細かく分けても運用上の利点が薄く、
				// 攻撃者に内部状態を伝える表面積を増やすだけなので統一する。
				slog.WarnContext(ctx, "sitemap auth: missing or invalid authorization header",
					"method", method,
					"path", path,
				)
				return response.Error(c, http.StatusUnauthorized, "unauthorized")
			}

			// fail-secure: 期待トークンが空（誤設定）のときは認証を成功させない。
			// この分岐がないと expectedToken == "" のときに ConstantTimeCompare(token, "")
			// が「token も空なら一致」と判定してしまい、空文字列で素通りされる事故になる。
			//
			// crypto/subtle.ConstantTimeCompare はタイミング攻撃対策のための定数時間比較。
			// 通常の == 演算子だと文字列の先頭から不一致箇所までの実行時間が変わるため、
			// 攻撃者が応答時間からトークンを 1 文字ずつ推測できてしまう（理論上の脅威だが、
			// 認証に関わる比較ではベストプラクティスとして使う）。
			//
			// ConstantTimeCompare はバイト列の長さが異なると即座に 0 を返すため、
			// 長さの違いによるタイミング差は別途吸収される（短いトークンだと不一致でも
			// 短時間で返るが、これは攻撃の成功には繋がらない）。
			if expectedToken == "" ||
				subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) != 1 {
				slog.WarnContext(ctx, "sitemap auth: token mismatch",
					"method", method,
					"path", path,
				)
				return response.Error(c, http.StatusUnauthorized, "unauthorized")
			}

			return next(c)
		}
	}
}
