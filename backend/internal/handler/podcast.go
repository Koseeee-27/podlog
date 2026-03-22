package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/external/ogp"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// PodcastHandler はポッドキャスト関連のHTTPハンドラーです。
// reviewUsecase はポッドキャスト詳細に平均評価・レビュー件数を付加するために使用します。
type PodcastHandler struct {
	podcastUsecase    usecase.PodcastUsecase
	reviewUsecase     usecase.ReviewUsecase
	favoritePodcastRepo repository.FavoritePodcastRepository
	ogpScraper        *ogp.Scraper
}

// NewPodcastHandler は PodcastHandler を生成します。
// reviewUsecase はポッドキャスト詳細レスポンスに平均評価を含めるために必要です。
// favoritePodcastRepo は番組詳細レスポンスにお気に入り件数を含めるために必要です。
func NewPodcastHandler(podcastUsecase usecase.PodcastUsecase, reviewUsecase usecase.ReviewUsecase, favoritePodcastRepo repository.FavoritePodcastRepository, ogpScraper *ogp.Scraper) *PodcastHandler {
	return &PodcastHandler{
		podcastUsecase:    podcastUsecase,
		reviewUsecase:     reviewUsecase,
		favoritePodcastRepo: favoritePodcastRepo,
		ogpScraper:        ogpScraper,
	}
}

// Search はアプリ内 DB でポッドキャストをキーワード検索するハンドラーです。
// genre クエリパラメータを指定すると、そのジャンルに絞り込んで検索できます。
// @Summary ポッドキャスト検索
// @Description アプリ内 DB に登録済みの番組をキーワードで検索します。平均評価・レビュー件数を含みます。genre パラメータでジャンル絞り込みが可能です。
// @Tags podcasts
// @Produce json
// @Param q query string false "検索キーワード（genre 指定時は省略可）"
// @Param genre query string false "親カテゴリ名（ジャンル一覧 API の id を指定。サブカテゴリに自動展開される）"
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "オフセット" default(0)
// @Success 200 {object} usecase.PodcastSearchResult
// @Failure 400 {object} map[string]string
// @Router /podcasts/search [get]
func (h *PodcastHandler) Search(c echo.Context) error {
	query := c.QueryParam("q")
	genre := c.QueryParam("genre")

	// genre が指定されていればキーワード無しでのブラウズを許可する
	if query == "" && genre == "" {
		return response.Error(c, http.StatusBadRequest, "query parameter 'q' is required (can be omitted when 'genre' is specified)")
	}
	limit, offset := parsePagination(c)

	result, err := h.podcastUsecase.Search(c.Request().Context(), query, genre, limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to search podcasts")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetPopular はレビュー件数の多い人気番組を取得するハンドラーです。
// @Summary 人気ポッドキャスト一覧
// @Description レビュー件数の多い番組をランキング順で取得します。探す画面の「人気の番組」セクションで使用します。
// @Tags podcasts
// @Produce json
// @Param limit query int false "最大取得件数" default(10)
// @Success 200 {object} usecase.PodcastSearchResult
// @Router /podcasts/popular [get]
func (h *PodcastHandler) GetPopular(c echo.Context) error {
	limit := 10
	if l := c.QueryParam("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	result, err := h.podcastUsecase.GetPopular(c.Request().Context(), limit)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get popular podcasts")
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

	// お気に入り件数を取得
	favoriteCount, err := h.favoritePodcastRepo.CountByPodcastID(c.Request().Context(), id)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get favorite count")
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
		FavoriteCount: favoriteCount,
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
