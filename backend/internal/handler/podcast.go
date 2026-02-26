package handler

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/external/ogp"
	"github.com/kobayashikosei/podlog/backend/internal/response"
	"github.com/kobayashikosei/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// PodcastHandler はポッドキャスト関連のHTTPハンドラーです。
type PodcastHandler struct {
	podcastUsecase usecase.PodcastUsecase
	ogpScraper     *ogp.Scraper
}

// NewPodcastHandler は PodcastHandler を生成します。
func NewPodcastHandler(podcastUsecase usecase.PodcastUsecase, ogpScraper *ogp.Scraper) *PodcastHandler {
	return &PodcastHandler{
		podcastUsecase: podcastUsecase,
		ogpScraper:     ogpScraper,
	}
}

// Search は iTunes API 経由でポッドキャストを検索するハンドラーです。
// @Summary ポッドキャスト検索
// @Description iTunes API を使ってポッドキャストを検索します
// @Tags podcasts
// @Produce json
// @Param q query string true "検索キーワード"
// @Param limit query int false "最大取得件数" default(20)
// @Success 200 {array} model.Podcast
// @Failure 400 {object} map[string]string
// @Security BearerAuth
// @Router /podcasts/search [get]
func (h *PodcastHandler) Search(c echo.Context) error {
	query := c.QueryParam("q")
	if query == "" {
		return response.Error(c, http.StatusBadRequest, "query parameter 'q' is required")
	}

	limit := 20 // デフォルト値

	podcasts, err := h.podcastUsecase.Search(c.Request().Context(), query, limit)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to search podcasts")
	}

	return response.Success(c, http.StatusOK, podcasts)
}

// GetByID はポッドキャスト詳細を取得するハンドラーです。
// @Summary ポッドキャスト詳細取得
// @Description ポッドキャストIDから詳細情報を取得します
// @Tags podcasts
// @Produce json
// @Param id path string true "ポッドキャストID (UUID)"
// @Success 200 {object} model.Podcast
// @Failure 404 {object} map[string]string
// @Router /podcasts/{id} [get]
func (h *PodcastHandler) GetByID(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid podcast ID")
	}

	podcast, err := h.podcastUsecase.GetByID(c.Request().Context(), id)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return response.Error(c, http.StatusNotFound, "podcast not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get podcast")
	}

	return response.Success(c, http.StatusOK, podcast)
}

// FetchURL は外部URLからOGP情報を取得するハンドラーです。
// Radiko など iTunes 以外のソースからポッドキャスト情報を取得する際に使用します。
// @Summary URL情報取得
// @Description 外部URLからOGP情報を取得します
// @Tags podcasts
// @Accept json
// @Produce json
// @Param body body object true "URL" example({"url": "https://example.com/podcast"})
// @Success 200 {object} ogp.OGPData
// @Failure 400 {object} map[string]string
// @Security BearerAuth
// @Router /podcasts/fetch-url [post]
func (h *PodcastHandler) FetchURL(c echo.Context) error {
	var req struct {
		URL string `json:"url"`
	}
	if err := c.Bind(&req); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	if req.URL == "" {
		return response.Error(c, http.StatusBadRequest, "url is required")
	}

	data, err := h.ogpScraper.Fetch(c.Request().Context(), req.URL)
	if err != nil {
		if strings.Contains(err.Error(), "HTTPS") || strings.Contains(err.Error(), "private IP") {
			return response.Error(c, http.StatusBadRequest, err.Error())
		}
		return response.Error(c, http.StatusBadGateway, "failed to fetch URL information")
	}

	return response.Success(c, http.StatusOK, data)
}
