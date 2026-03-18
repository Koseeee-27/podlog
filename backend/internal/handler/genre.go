package handler

import (
	"net/http"

	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// GenreHandler はジャンル関連のHTTPハンドラーです。
type GenreHandler struct {
	genreUsecase usecase.GenreUsecase
}

// NewGenreHandler は GenreHandler を生成します。
func NewGenreHandler(genreUsecase usecase.GenreUsecase) *GenreHandler {
	return &GenreHandler{
		genreUsecase: genreUsecase,
	}
}

// ListGenres は DB に登録されている番組のジャンル一覧を返すハンドラーです。
// ジャンル名の英語表記と日本語表記を両方含みます。
// @Summary ジャンル一覧取得
// @Description DB に登録されている番組のジャンル一覧を取得します。英語名・日本語名の両方を含みます。
// @Tags genres
// @Produce json
// @Success 200 {object} usecase.GenreListResult
// @Failure 500 {object} map[string]string
// @Router /genres [get]
func (h *GenreHandler) ListGenres(c echo.Context) error {
	result, err := h.genreUsecase.ListGenres(c.Request().Context())
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to list genres")
	}

	return response.Success(c, http.StatusOK, result)
}
