// Package handler はHTTPリクエストを受け取り、レスポンスを返すHTTP層です。
// リクエストの解析（バインド）とレスポンスの返却のみを担当し、
// ビジネスロジックは usecase 層に委譲します。
package handler

import (
	"log"
	"net/http"

	"github.com/jmoiron/sqlx"

	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/labstack/echo/v4"
)

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
	// リクエストコンテキストを渡すことで、リクエストのタイムアウトが適用される
	if err := h.db.PingContext(c.Request().Context()); err != nil {
		log.Printf("[HEALTH] DB ping failed: %v", err)
		return response.Error(c, http.StatusServiceUnavailable, "database connection failed")
	}

	return response.Success(c, http.StatusOK, map[string]string{
		"status": "ok",
	})
}
