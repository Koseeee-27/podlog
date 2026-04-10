// Package handler はHTTPリクエストを受け取り、レスポンスを返すHTTP層です。
// リクエストの解析（バインド）とレスポンスの返却のみを担当し、
// ビジネスロジックは usecase 層に委譲します。
package handler

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/labstack/echo/v4"
)

// healthCheckTimeout はヘルスチェックの DB ping に適用する専用タイムアウトです。
//
// Cloud Run のヘルスチェックはデフォルトで数秒のタイムアウトを設定しますが、
// リクエストコンテキストのタイムアウト（30秒）がそのまま PingContext に適用されると、
// DB がハングした場合にゴルーチンが長時間ブロックされてしまいます。
// 3 秒の専用タイムアウトを設けることで、DB 応答がない場合にも素早く 503 を返せます。
const healthCheckTimeout = 3 * time.Second

// HealthHandler はヘルスチェック用のハンドラーです。
// DB への接続状態も確認するため、*sqlx.DB を保持します。
type HealthHandler struct {
	db *sqlx.DB
}

// NewHealthHandler は HealthHandler を生成します。
// 引数の db は DB 接続プールで、ヘルスチェック時に PingContext で疎通確認に使います。
func NewHealthHandler(db *sqlx.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

// Check はヘルスチェックエンドポイントのハンドラーです。
//
// Cloud Run はこのエンドポイントでインスタンスの健全性を判断します。
// DB に PingContext を送り、接続できなければ 503 を返すことで、
// DB 未接続のインスタンスにトラフィックが流れるのを防ぎます。
//
// @Summary ヘルスチェック
// @Description サーバーとDBの稼働状態を確認します
// @Tags health
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 503 {object} map[string]string
// @Router /health [get]
func (h *HealthHandler) Check(c echo.Context) error {
	// DB への疎通確認（PingContext はコネクションプールから接続を取得して ping を送る）
	// 専用の短いタイムアウトを設定し、DB がハングしても早期に 503 を返せるようにする
	ctx, cancel := context.WithTimeout(c.Request().Context(), healthCheckTimeout)
	defer cancel()

	if err := h.db.PingContext(ctx); err != nil {
		log.Printf("[HEALTH] DB ping failed: %v", err)
		return response.Error(c, http.StatusServiceUnavailable, "database connection failed")
	}

	return response.Success(c, http.StatusOK, map[string]string{
		"status": "ok",
	})
}
