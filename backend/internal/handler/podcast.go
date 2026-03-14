package handler

import (
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/external/ogp"
	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// PodcastHandler はポッドキャスト関連のHTTPハンドラーです。
// reviewUsecase はポッドキャスト詳細に平均評価・レビュー件数を付加するために使用します。
type PodcastHandler struct {
	podcastUsecase usecase.PodcastUsecase
	reviewUsecase  usecase.ReviewUsecase
	ogpScraper     *ogp.Scraper
}

// NewPodcastHandler は PodcastHandler を生成します。
// reviewUsecase はポッドキャスト詳細レスポンスに平均評価を含めるために必要です。
func NewPodcastHandler(podcastUsecase usecase.PodcastUsecase, reviewUsecase usecase.ReviewUsecase, ogpScraper *ogp.Scraper) *PodcastHandler {
	return &PodcastHandler{
		podcastUsecase: podcastUsecase,
		reviewUsecase:  reviewUsecase,
		ogpScraper:     ogpScraper,
	}
}

// Search はアプリ内 DB でポッドキャストをキーワード検索するハンドラーです。
// @Summary ポッドキャスト検索
// @Description アプリ内 DB に登録済みの番組をキーワードで検索します。平均評価・レビュー件数を含みます。
// @Tags podcasts
// @Produce json
// @Param q query string true "検索キーワード"
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "オフセット" default(0)
// @Success 200 {object} usecase.PodcastSearchResult
// @Failure 400 {object} map[string]string
// @Router /podcasts/search [get]
func (h *PodcastHandler) Search(c echo.Context) error {
	query := c.QueryParam("q")
	if query == "" {
		return response.Error(c, http.StatusBadRequest, "query parameter 'q' is required")
	}

	limit, offset := parsePagination(c)

	result, err := h.podcastUsecase.Search(c.Request().Context(), query, limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to search podcasts")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetByID はポッドキャスト詳細を取得するハンドラーです。
// API 設計書に従い、番組情報に加えて average_rating / total_reviews を含むレスポンスを返します。
// @Summary ポッドキャスト詳細取得
// @Description ポッドキャストIDから詳細情報を取得します。平均評価・レビュー件数を含みます。
// @Tags podcasts
// @Produce json
// @Param id path string true "ポッドキャストID (UUID)"
// @Success 200 {object} usecase.PodcastDetailResult
// @Failure 404 {object} map[string]string
// @Router /podcasts/{id} [get]
func (h *PodcastHandler) GetByID(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid podcast ID")
	}

	podcast, err := h.podcastUsecase.GetByID(c.Request().Context(), id)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "podcast not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get podcast")
	}

	// ReviewUsecase から平均評価とレビュー件数を取得
	rating, err := h.reviewUsecase.GetPodcastRating(c.Request().Context(), id)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get podcast rating")
	}

	// API 設計書のレスポンス形式に合わせて組み立て
	result := usecase.PodcastDetailResult{
		ID:            podcast.ID,
		Title:         podcast.Title,
		Author:        podcast.Author,
		Description:   podcast.Description,
		ArtworkURL:    podcast.ArtworkURL,
		Genre:         podcast.Genre,
		FeedURL:       podcast.FeedURL,
		AverageRating: rating.AverageRating,
		TotalReviews:  rating.TotalReviews,
		CreatedAt:     podcast.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return response.Success(c, http.StatusOK, result)
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
		// SSRF 関連エラー（HTTPS only / プライベート IP ブロック）は 400 を返す
		if errors.Is(err, ogp.ErrSSRFBlocked) {
			return response.Error(c, http.StatusBadRequest, err.Error())
		}
		return response.Error(c, http.StatusBadGateway, "failed to fetch URL information")
	}

	return response.Success(c, http.StatusOK, data)
}
