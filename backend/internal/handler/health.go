// Package handler はHTTPリクエストを受け取り、レスポンスを返すHTTP層です。
// リクエストの解析（バインド）とレスポンスの返却のみを担当し、
// ビジネスロジックは usecase 層に委譲します。
package handler

import (
	"net/http"

	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/labstack/echo/v4"
)

// HealthHandler はヘルスチェック用のハンドラーです。
type HealthHandler struct{}

// NewHealthHandler は HealthHandler を生成します。
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Check はヘルスチェックエンドポイントのハンドラーです。
// @Summary ヘルスチェック
// @Description サーバーの稼働状態を確認します
// @Tags health
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func (h *HealthHandler) Check(c echo.Context) error {
	return response.Success(c, http.StatusOK, map[string]string{
		"status": "ok",
	})
}
