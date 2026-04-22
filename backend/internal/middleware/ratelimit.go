// Package middleware はアプリケーション固有の Echo ミドルウェアを提供します。
package middleware

import (
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"math"
	"net/http"
	"strconv"
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

// identifierHashLen はログに残す identifier ハッシュの先頭文字数です。
// 短すぎると衝突確率が上がり「どのクライアントか」の区別がつかず、
// 長すぎると IP の復元リスクが上がります。運用調査の粒度として 8 文字
// (= 16 進 4 バイト、約 40 億通り) にしています。
const identifierHashLen = 8

// NewRateLimiter は IP アドレスごとにレート制限を行う Echo ミドルウェアを返します。
//
// 仕様:
//   - reqPerMin: 1 IP あたり 1 分間に許可する平均リクエスト数（トークン補充レート）
//   - burst: 短時間に連続して許可できる最大リクエスト数（バケットサイズ）
//   - IP 特定: echo.Context.RealIP() を使用する
//     cmd/server/main.go で echo.ExtractIPFromXFFHeader(...) を IPExtractor に設定済み。
//     これにより X-Forwarded-For の右端から trust 対象 (loopback / private net) を
//     スキップして untrusted なクライアント IP を取り出すので、
//     攻撃者が XFF の先頭に偽装値を入れてもバケットを回避できない
//   - 拒否時: 429 Too Many Requests + Retry-After ヘッダを返す
//     Retry-After は reqPerMin から算出した「次のトークン補充までの秒数」
//     (= ceil(60 / reqPerMin)、最小 1 秒)
//   - ストア: in-memory（プロセスローカル）
//     Cloud Run の autoscale 時は実効レートが「設定値 × インスタンス数」になる点に注意
//
// ログ:
//
//	レート超過時は slog の WARN レベルで以下の属性を出力します:
//	  - path: c.Path() (例: "/podcasts/:id")
//	  - method: HTTP メソッド
//	  - identifier_hash: IP アドレスの SHA-256 を頭 N 文字に切り詰めた値
//	    PII (IP アドレス) を生のまま残すのを避けつつ、同一クライアントかの
//	    同定には十分な情報を残す折衷案。
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
	// Retry-After ヘッダに返す秒数を事前計算する。
	// 「次の 1 トークンが補充されるまでの秒数」の整数切り上げ。
	// reqPerMin=60 なら 1 秒、reqPerMin=20 なら 3 秒。
	// 保険として最低 1 秒を保証する (reqPerMin > 60 の極端な設定でも 0 秒にはしない)。
	// max は Go 1.21+ の組込み関数 (= 2 つの値の大きいほうを返す)。
	retryAfterSec := max(1, int(math.Ceil(60.0/float64(reqPerMin))))
	retryAfterHeader := strconv.Itoa(retryAfterSec)

	config := middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(
			middleware.RateLimiterMemoryStoreConfig{
				Rate:      rate.Limit(float64(reqPerMin) / 60.0),
				Burst:     burst,
				ExpiresIn: rateLimiterExpiresIn,
			},
		),
		// IdentifierExtractor は「同じクライアントからのリクエスト」を束ねるキーを返します。
		// c.RealIP() が空になる異常ケース (IPExtractor が IP を特定できない等) では
		// 全ユーザーが「空文字キー」という単一バケットに集約されて冗長な巻き添え 429 が
		// 発生するため、エラーを返して ErrorHandler (デフォルトで 403) に委ねます。
		IdentifierExtractor: func(c echo.Context) (string, error) {
			ip := c.RealIP()
			if ip == "" {
				return "", echo.NewHTTPError(http.StatusBadRequest, "client ip unavailable")
			}
			return ip, nil
		},
		// DenyHandler はレート超過時の応答を組み立てます。
		// Retry-After ヘッダは「何秒後に再試行してよいか」をクライアントに伝える標準ヘッダ。
		//
		// WARN レベルで拒否イベントを残すのは運用調査のため。
		// 頻発する ERROR を Cloud Error Reporting に通知させたくないので WARN に抑える。
		// identifier (IP) 自体は PII リスクを避けるためハッシュの頭数文字だけ記録する。
		DenyHandler: func(c echo.Context, identifier string, _ error) error {
			c.Response().Header().Set("Retry-After", retryAfterHeader)

			req := c.Request()
			slog.WarnContext(req.Context(), "rate limit exceeded",
				"method", req.Method,
				"path", c.Path(),
				"identifier_hash", hashIdentifier(identifier),
				"retry_after", retryAfterSec,
			)

			return echo.NewHTTPError(http.StatusTooManyRequests, "rate limit exceeded")
		},
	}
	return middleware.RateLimiterWithConfig(config)
}

// hashIdentifier は IP アドレス等の identifier を SHA-256 でハッシュし、
// 先頭 identifierHashLen 文字 (16 進) を返します。
//
// 目的: ログから生の IP を消すことで PII 漏洩リスクを下げつつ、
// 「同じクライアントか」の同定には十分な情報を残す。
func hashIdentifier(identifier string) string {
	sum := sha256.Sum256([]byte(identifier))
	return hex.EncodeToString(sum[:])[:identifierHashLen]
}
