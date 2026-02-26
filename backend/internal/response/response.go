// Package response はAPIレスポンスの共通ヘルパーを提供します。
// 全エンドポイントで統一されたJSON形式を返すために使います。
package response

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// Success は成功レスポンスを返します。
// data には返却したい任意のデータ（構造体やマップ）を渡します。
func Success(c echo.Context, statusCode int, data interface{}) error {
	return c.JSON(statusCode, data)
}

// Error はエラーレスポンスを返します。
// API設計規約に従い、{ "error": "メッセージ" } 形式で返却します。
func Error(c echo.Context, statusCode int, message string) error {
	return c.JSON(statusCode, map[string]string{
		"error": message,
	})
}

// ValidationError はバリデーションエラーレスポンスを返します。
// どのフィールドにどんなエラーがあるかを詳細に返します。
func ValidationError(c echo.Context, errors map[string]string) error {
	return c.JSON(http.StatusBadRequest, map[string]interface{}{
		"error":   "validation error",
		"details": errors,
	})
}

// PaginatedResponse はページネーション付きレスポンスの構造体です。
// カーソルベースページネーションで使用します。
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	NextCursor string      `json:"next_cursor,omitempty"`
	HasMore    bool        `json:"has_more"`
}

// Paginated はページネーション付きレスポンスを返します。
func Paginated(c echo.Context, data interface{}, nextCursor string, hasMore bool) error {
	return c.JSON(http.StatusOK, PaginatedResponse{
		Data:       data,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	})
}
