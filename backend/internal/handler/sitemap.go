package handler

import (
	"net/http"

	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// SitemapHandler は sitemap 用の軽量な全件取得 API のハンドラーです。
// FE の app/sitemap.ts から呼ばれ、sitemap.xml の生成に必要な id / updated_at のみを返します。
type SitemapHandler struct {
	sitemapUsecase usecase.SitemapUsecase
}

// NewSitemapHandler は SitemapHandler を生成します。
func NewSitemapHandler(sitemapUsecase usecase.SitemapUsecase) *SitemapHandler {
	return &SitemapHandler{
		sitemapUsecase: sitemapUsecase,
	}
}

// GetPodcasts は全 podcast の id / updated_at を返すハンドラーです。
// @Summary sitemap 用 podcast 一覧取得
// @Description sitemap 生成用に、全 podcast の id / updated_at のみを軽量に返します。ページングなし。
// @Tags sitemap
// @Produce json
// @Success 200 {object} usecase.SitemapPodcastsResult
// @Failure 500 {object} map[string]string
// @Router /sitemap/podcasts [get]
func (h *SitemapHandler) GetPodcasts(c echo.Context) error {
	result, err := h.sitemapUsecase.GetPodcasts(c.Request().Context())
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get podcasts for sitemap")
	}
	return response.Success(c, http.StatusOK, result)
}

// GetEpisodes は全 episode の id / updated_at を返すハンドラーです。
// @Summary sitemap 用 episode 一覧取得
// @Description sitemap 生成用に、全 episode の id / updated_at のみを軽量に返します。ページングなし。
// @Tags sitemap
// @Produce json
// @Success 200 {object} usecase.SitemapEpisodesResult
// @Failure 500 {object} map[string]string
// @Router /sitemap/episodes [get]
func (h *SitemapHandler) GetEpisodes(c echo.Context) error {
	result, err := h.sitemapUsecase.GetEpisodes(c.Request().Context())
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get episodes for sitemap")
	}
	return response.Success(c, http.StatusOK, result)
}

// GetUsers は有効な全ユーザーの username / updated_at を返すハンドラーです。
// @Summary sitemap 用 user 一覧取得
// @Description sitemap 生成用に、有効な全ユーザーの username / updated_at のみを軽量に返します。ページングなし。ソフトデリート済みユーザーは除外。
// @Tags sitemap
// @Produce json
// @Success 200 {object} usecase.SitemapUsersResult
// @Failure 500 {object} map[string]string
// @Router /sitemap/users [get]
func (h *SitemapHandler) GetUsers(c echo.Context) error {
	result, err := h.sitemapUsecase.GetUsers(c.Request().Context())
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get users for sitemap")
	}
	return response.Success(c, http.StatusOK, result)
}
