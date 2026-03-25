package handler

import (
	"strconv"

	"github.com/labstack/echo/v4"
)

// parsePagination はクエリパラメータから limit と offset を取得する共通ヘルパーです。
// limit: 1〜100（不正値はデフォルト 20）、offset: 0 以上（デフォルト 0）
// 注意: podcast.Search 等、usecase 固有の上限がある場合は usecase 側でも
// 別途バリデーションが行われます。
func parsePagination(c echo.Context) (int, int) {
	limit := 20
	offset := 0

	if l := c.QueryParam("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}
	if o := c.QueryParam("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil {
			offset = parsed
		}
	}

	// limit が不正な値の場合はデフォルト値にリセット（usecase 層と同じ挙動）
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	// offset が負の場合は 0 にリセット
	if offset < 0 {
		offset = 0
	}

	return limit, offset
}
