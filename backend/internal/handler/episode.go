package handler

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/external/rss"
	mw "github.com/Koseeee-27/podlog/backend/internal/middleware"
	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// feedStaleDuration は RSS フィードのキャッシュ有効期間です。
// この時間を超えた場合、バックグラウンドで RSS フィードを再取得します。
const feedStaleDuration = 6 * time.Hour

// EpisodeHandler はエピソード関連のHTTPハンドラーです。
// podcastUsecase は feed_url を持つポッドキャストの取得に使用します。
// reviewUsecase はエピソード詳細に平均評価・レビュー件数を付加するために使用します。
type EpisodeHandler struct {
	episodeUsecase usecase.EpisodeUsecase
	podcastUsecase usecase.PodcastUsecase
	reviewUsecase  usecase.ReviewUsecase
}

// NewEpisodeHandler は EpisodeHandler を生成します。
// podcastUsecase は FetchFromFeed で feed_url を取得するために必要です。
// reviewUsecase はエピソード詳細のレスポンスに平均評価を含めるために必要です。
func NewEpisodeHandler(episodeUsecase usecase.EpisodeUsecase, podcastUsecase usecase.PodcastUsecase, reviewUsecase usecase.ReviewUsecase) *EpisodeHandler {
	return &EpisodeHandler{
		episodeUsecase: episodeUsecase,
		podcastUsecase: podcastUsecase,
		reviewUsecase:  reviewUsecase,
	}
}

// Create はポッドキャストに新しいエピソードを追加するハンドラーです。
// 新規作成時は 201 Created、既存エピソード返却時（iTunes Track ID 重複）は 200 OK を返します。
// @Summary エピソード作成
// @Description ポッドキャストに新しいエピソードを登録します。iTunes Track ID が既に存在する場合は既存エピソードを返します。
// @Tags episodes
// @Accept json
// @Produce json
// @Param id path string true "ポッドキャストID (UUID)"
// @Param body body usecase.CreateEpisodeInput true "エピソード情報"
// @Success 201 {object} model.Episode "新規作成"
// @Success 200 {object} model.Episode "既存エピソード返却（iTunes Track ID 重複）"
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /podcasts/{id}/episodes [post]
func (h *EpisodeHandler) Create(c echo.Context) error {
	podcastID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid podcast ID")
	}

	var input usecase.CreateEpisodeInput
	if err := c.Bind(&input); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	result, err := h.episodeUsecase.Create(c.Request().Context(), podcastID, input)
	if err != nil {
		var validationErr *usecase.ValidationError
		if errors.As(err, &validationErr) {
			return response.Error(c, http.StatusBadRequest, err.Error())
		}
		return response.Error(c, http.StatusInternalServerError, "failed to create episode")
	}

	if result.Created {
		return response.Success(c, http.StatusCreated, result.Episode)
	}
	return response.Success(c, http.StatusOK, result.Episode)
}

// GetByID はエピソード詳細を取得するハンドラーです。
// API 設計書に従い、podcast 情報と average_rating / total_reviews を含むレスポンスを返します。
// @Summary エピソード詳細取得
// @Description エピソードIDから詳細情報を取得します。ポッドキャスト情報・平均評価・レビュー件数を含みます。
// @Tags episodes
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Success 200 {object} usecase.EpisodeDetailResult
// @Failure 404 {object} map[string]string
// @Router /episodes/{id} [get]
func (h *EpisodeHandler) GetByID(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	ctx := c.Request().Context()

	// エピソード情報を取得
	episode, err := h.episodeUsecase.GetByID(ctx, id)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "episode not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get episode")
	}

	// ポッドキャスト情報を取得
	podcast, err := h.podcastUsecase.GetByID(ctx, episode.PodcastID)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, notFoundErr.Error())
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get podcast")
	}

	// エピソードの平均評価・レビュー件数を取得（統計専用メソッドで軽量に取得）
	rating, err := h.reviewUsecase.GetEpisodeRating(ctx, id)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get episode rating")
	}

	// API 設計書のレスポンス形式に合わせて組み立て
	result := usecase.EpisodeDetailResult{
		ID:          episode.ID,
		Title:       episode.Title,
		Description: episode.Description,
		AudioURL:    episode.AudioURL,
		ArtworkURL:  episode.ArtworkURL,
		DurationMs:  episode.DurationMs,
		Podcast: usecase.EpisodePodcastInfo{
			ID:         podcast.ID,
			Title:      podcast.Title,
			ArtworkURL: podcast.ArtworkURL,
		},
		AverageRating: rating.AverageRating,
		TotalReviews:  rating.TotalReviews,
		CreatedAt:     episode.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if episode.PublishedAt != nil {
		formatted := episode.PublishedAt.Format("2006-01-02T15:04:05Z07:00")
		result.PublishedAt = &formatted
	}

	return response.Success(c, http.StatusOK, result)
}

// GetByPodcastID はポッドキャストのエピソード一覧を取得するハンドラーです。
// API 設計書に従い、各エピソードに average_rating / total_reviews を含み、total を返します。
//
// Stale-While-Revalidate 方式:
//   - DB にエピソードが 0 件の場合: RSS フィードを同期的に取得してから返す（初回のみ待ちが発生）
//   - DB にエピソードがある場合: DB のデータを即座に返す
//   - feed_last_fetched_at から feedStaleDuration（6時間）経過: バックグラウンドで RSS を再取得
//
// @Summary エピソード一覧取得
// @Description ポッドキャストIDに紐づくエピソード一覧を取得します。各エピソードに平均評価・レビュー件数を含みます。
// @Tags podcasts
// @Produce json
// @Param id path string true "ポッドキャストID (UUID)"
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {object} usecase.EpisodeListResult
// @Failure 400 {object} map[string]string
// @Router /podcasts/{id}/episodes [get]
func (h *EpisodeHandler) GetByPodcastID(c echo.Context) error {
	podcastID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid podcast ID")
	}

	ctx := c.Request().Context()
	limit, offset := parsePagination(c)

	// ポッドキャスト情報を取得して feed_url と feed_last_fetched_at を確認する
	podcast, err := h.podcastUsecase.GetByID(ctx, podcastID)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "podcast not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get podcast")
	}

	hasFeedURL := podcast.FeedURL != nil && *podcast.FeedURL != ""

	// エピソード一覧を取得
	result, err := h.episodeUsecase.GetByPodcastIDWithStats(ctx, podcastID, limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get episodes")
	}

	if hasFeedURL {
		if result.Total == 0 {
			// DB にエピソードが 0 件 → 同期的に RSS フィードを取得してからエピソードを返す
			_, fetchErr := h.episodeUsecase.FetchFromFeed(ctx, podcastID, *podcast.FeedURL)
			if fetchErr != nil {
				log.Printf("[GetByPodcastID] failed to fetch feed for podcast %s: %v", podcastID, fetchErr)
				// フェッチ失敗でも空のレスポンスを返す（エラーにはしない）
				return response.Success(c, http.StatusOK, result)
			}
			// フェッチ成功 → DB から改めてエピソードを取得して返す
			result, err = h.episodeUsecase.GetByPodcastIDWithStats(ctx, podcastID, limit, offset)
			if err != nil {
				return response.Error(c, http.StatusInternalServerError, "failed to get episodes")
			}
		} else if h.isFeedStale(podcast.FeedLastFetchedAt) {
			// キャッシュが古い → バックグラウンドで RSS を再取得（レスポンスは待たない）
			go h.refreshFeedInBackground(podcastID, *podcast.FeedURL)
		}
	}

	return response.Success(c, http.StatusOK, result)
}

// isFeedStale は feed_last_fetched_at が feedStaleDuration を超えて古いかどうかを判定します。
// feed_last_fetched_at が nil（未取得）の場合も古いと判定します。
func (h *EpisodeHandler) isFeedStale(lastFetchedAt *time.Time) bool {
	if lastFetchedAt == nil {
		return true
	}
	return time.Since(*lastFetchedAt) > feedStaleDuration
}

// refreshFeedInBackground は goroutine から呼ばれ、RSS フィードをバックグラウンドで再取得します。
// リクエストの context はレスポンス送信後にキャンセルされるため、
// バックグラウンドタスク用に新しい context を生成します（最大60秒のタイムアウト付き）。
func (h *EpisodeHandler) refreshFeedInBackground(podcastID uuid.UUID, feedURL string) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	_, err := h.episodeUsecase.FetchFromFeed(ctx, podcastID, feedURL)
	if err != nil {
		log.Printf("[refreshFeedInBackground] failed to refresh feed for podcast %s: %v", podcastID, err)
	}
}

// FetchFromFeed は RSS フィードからエピソードを自動取得するハンドラーです。
// ポッドキャストに保存されている feed_url から RSS を取得し、新規エピソードをDBに登録します。
// @Summary RSSフィードからエピソード取得
// @Description ポッドキャストのRSSフィードからエピソードを自動取得してDBに登録します。GUIDで重複を検知し、新規のみ追加します。
// @Tags episodes
// @Produce json
// @Param id path string true "ポッドキャストID (UUID)"
// @Success 200 {object} usecase.FetchFromFeedResult "取得結果（新規・スキップ・失敗件数）"
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /podcasts/{id}/episodes/fetch [post]
func (h *EpisodeHandler) FetchFromFeed(c echo.Context) error {
	// 1. ポッドキャスト ID をパース
	podcastID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid podcast ID")
	}

	// 2. ポッドキャストを取得して feed_url の存在を確認
	podcast, err := h.podcastUsecase.GetByID(c.Request().Context(), podcastID)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "podcast not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get podcast")
	}

	if podcast.FeedURL == nil || *podcast.FeedURL == "" {
		return response.Error(c, http.StatusBadRequest, "podcast does not have a feed URL")
	}

	// 3. RSS フィードからエピソードを取得
	result, err := h.episodeUsecase.FetchFromFeed(c.Request().Context(), podcastID, *podcast.FeedURL)
	if err != nil {
		// SSRF 関連エラー（HTTPS only / プライベート IP ブロック）は 400 を返す
		if errors.Is(err, rss.ErrSSRFBlocked) {
			return response.Error(c, http.StatusBadRequest, err.Error())
		}
		return response.Error(c, http.StatusInternalServerError, "failed to fetch episodes from feed")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetRecentEpisodes は認証ユーザーがまだ聴いていないエピソードを番組ごとにグループ化して取得するハンドラーです。
// ユーザーが聴取記録をつけた番組のうち、未聴取のエピソードを各番組最新3件まで返します。
// 記録ページの「最近のエピソード」セクションで使用します。
// @Summary 最近のエピソード取得（番組グループ化）
// @Description 認証ユーザーが記録をつけた番組の、まだ聴いていないエピソードを番組ごとにグループ化して取得します。各番組の未聴取エピソードは最新3件まで返します。
// @Tags episodes
// @Produce json
// @Success 200 {object} usecase.RecentEpisodeListResult
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /users/me/recent-episodes [get]
func (h *EpisodeHandler) GetRecentEpisodes(c echo.Context) error {
	// 認証ミドルウェアが設定した userID を取得
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	// ユースケースを呼び出してエピソード一覧を取得
	result, err := h.episodeUsecase.GetRecentForUser(c.Request().Context(), userID)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get recent episodes")
	}

	return response.Success(c, http.StatusOK, result)
}
