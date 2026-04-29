package handler

import (
	"log/slog"
	"net/http"

	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// SitemapHandler は sitemap 用の軽量な全件取得 API のハンドラーです。
// FE の app/sitemap.ts から呼ばれ、sitemap.xml の生成に必要な id / updated_at のみを返します。
//
// 認証: middleware.SitemapAuth による Bearer トークン認証で保護されています。
// FE と BE で共有秘密のトークン（SITEMAP_API_TOKEN）を環境変数で持ち、
// FE が Authorization ヘッダーで送信し BE が突合する pre-shared token 方式です。
// JWT ではなく単純な共有秘密で十分な内部 API のため、@Security BearerAuth は
// 既存の JWT 用定義を流用していますが、運用上の意味は「共有秘密の Bearer」です。
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
// @Description sitemap 生成用に、全 podcast の id / updated_at のみを軽量に返します。ページングなし。FE の app/sitemap.ts からのみ呼ばれる内部 API で、Authorization ヘッダーで共有秘密の Bearer トークン（SITEMAP_API_TOKEN）を要求します（development 環境では認証スキップ）。
// @Tags sitemap
// @Produce json
// @Security BearerAuth
// @Success 200 {object} usecase.SitemapPodcastsResult
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /sitemap/podcasts [get]
func (h *SitemapHandler) GetPodcasts(c echo.Context) error {
	ctx := c.Request().Context()
	result, err := h.sitemapUsecase.GetPodcasts(ctx)
	if err != nil {
		// DB ダウン等の障害を Cloud Error Reporting で検知できるよう ERROR で残す。
		// sitemap API は cron / クローラーからの低頻度 hit のため ERROR でもノイズにならない。
		slog.ErrorContext(ctx, "failed to get podcasts for sitemap", "error", err)
		return response.Error(c, http.StatusInternalServerError, "failed to get podcasts for sitemap")
	}
	return response.Success(c, http.StatusOK, result)
}

// GetEpisodes は全 episode の id / updated_at を返すハンドラーです。
// @Summary sitemap 用 episode 一覧取得
// @Description sitemap 生成用に、全 episode の id / updated_at のみを軽量に返します。ページングなし。FE の app/sitemap.ts からのみ呼ばれる内部 API で、Authorization ヘッダーで共有秘密の Bearer トークン（SITEMAP_API_TOKEN）を要求します（development 環境では認証スキップ）。
// @Tags sitemap
// @Produce json
// @Security BearerAuth
// @Success 200 {object} usecase.SitemapEpisodesResult
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /sitemap/episodes [get]
func (h *SitemapHandler) GetEpisodes(c echo.Context) error {
	ctx := c.Request().Context()
	result, err := h.sitemapUsecase.GetEpisodes(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "failed to get episodes for sitemap", "error", err)
		return response.Error(c, http.StatusInternalServerError, "failed to get episodes for sitemap")
	}
	return response.Success(c, http.StatusOK, result)
}

// GetUsers は有効な全ユーザーの username / updated_at を返すハンドラーです。
// @Summary sitemap 用 user 一覧取得
// @Description sitemap 生成用に、有効な全ユーザーの username / updated_at のみを軽量に返します。ページングなし。ソフトデリート済みユーザーは除外。FE の app/sitemap.ts からのみ呼ばれる内部 API で、Authorization ヘッダーで共有秘密の Bearer トークン（SITEMAP_API_TOKEN）を要求します（development 環境では認証スキップ）。
// @Tags sitemap
// @Produce json
// @Security BearerAuth
// @Success 200 {object} usecase.SitemapUsersResult
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /sitemap/users [get]
func (h *SitemapHandler) GetUsers(c echo.Context) error {
	ctx := c.Request().Context()
	result, err := h.sitemapUsecase.GetUsers(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "failed to get users for sitemap", "error", err)
		return response.Error(c, http.StatusInternalServerError, "failed to get users for sitemap")
	}
	return response.Success(c, http.StatusOK, result)
}
