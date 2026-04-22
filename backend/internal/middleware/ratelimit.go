// Package middleware はアプリケーション固有の Echo ミドルウェアを提供します。
package middleware

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

// rateLimiterExpiresIn は非アクティブな IP エントリが
// メモリストアから削除されるまでの時間です。
//
// 3 分間同じ IP からのリクエストがなければ、その IP のエントリは
// 次回リクエスト時のクリーンアップ処理で削除されます。
// 短くしすぎるとメモリから消えた直後のリクエストでバーストが全量回復してしまうため、
// デフォルトの 3 分を採用しています。
const rateLimiterExpiresIn = 3 * time.Minute

// NewRateLimiter は IP アドレスごとにレート制限を行う Echo ミドルウェアを返します。
//
// 仕様:
//   - reqPerMin: 1 IP あたり 1 分間に許可する平均リクエスト数（トークン補充レート）
//   - burst: 短時間に連続して許可できる最大リクエスト数（バケットサイズ）
//   - IP 特定: echo.Context.RealIP() を使用する
//     Cloud Run では前段の Google Front End が X-Forwarded-For を付与するため、
//     c.RealIP() が自動的にクライアント IP を返す
//   - 拒否時: 429 Too Many Requests + Retry-After: 60 ヘッダを返す
//   - ストア: in-memory（プロセスローカル）
//     Cloud Run の autoscale 時は実効レートが「設定値 × インスタンス数」になる点に注意
//
// トークンバケットの仕組み（Go 初学者向け補足）:
//
//	内部では golang.org/x/time/rate.Limiter を使っており、
//	「毎秒 Rate 個のトークンがバケットに補充され、リクエスト 1 回につき 1 個消費する」
//	という挙動になります。バケットの最大サイズが Burst です。
//	バケットが空のとき次の補充までリクエストは拒否されます。
//
// パラメータの設計:
//
//	rate.Limit は req/sec（1 秒あたり）なので、reqPerMin を 60 で割って渡します。
//	例: reqPerMin=60 なら 1 req/sec、burst=20 なら瞬間的に 20 リクエストまで許容。
func NewRateLimiter(reqPerMin int, burst int) echo.MiddlewareFunc {
	config := middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{
				Rate:      rate.Limit(float64(reqPerMin) / 60.0),
				Burst:     burst,
				ExpiresIn: rateLimiterExpiresIn,
			},
		),
		// IdentifierExtractor は「同じクライアントからのリクエスト」を束ねるキーを返します。
		// ここでは IP アドレスでグルーピングします。
		IdentifierExtractor: func(c echo.Context) (string, error) {
			return c.RealIP(), nil
		},
		// DenyHandler はレート超過時の応答を組み立てます。
		// Retry-After ヘッダは「何秒後に再試行してよいか」をクライアントに伝える標準ヘッダです。
		// ここでは reqPerMin の分母（60 秒）を一律で返しています。
		DenyHandler: func(c echo.Context, _ string, _ error) error {
			c.Response().Header().Set("Retry-After", "60")
			return echo.NewHTTPError(http.StatusTooManyRequests, "rate limit exceeded")
		},
	}
	return middleware.RateLimiterWithConfig(config)
}
