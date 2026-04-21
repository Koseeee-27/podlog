package handler

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/external/rss"
	mw "github.com/Koseeee-27/podlog/backend/internal/middleware"
	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

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
// OptionalJWTAuth ミドルウェアの後に実行され、認証済みの場合は聴取状態（listened）も含みます。
// @Summary エピソード詳細取得
// @Description エピソードIDから詳細情報を取得します。ポッドキャスト情報・平均評価・レビュー件数を含みます。認証済みの場合は聴取状態も含みます。
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

	// OptionalJWTAuth で設定されたユーザーID（未認証なら nil）
	userID := mw.GetOptionalUserID(c)

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

	// 認証済みの場合、聴取状態を取得して設定
	// listened は付加情報のため、取得失敗時もメインの詳細レスポンスは返す（Graceful Degradation）
	if userID != nil {
		listened, err := h.episodeUsecase.IsListened(ctx, *userID, id)
		if err != nil {
			// 付加情報の取得失敗のためユーザー体験への影響はない → WARN
			// （ERROR にすると Cloud Error Reporting に通知され、運用ノイズになる）
			slog.WarnContext(ctx, "failed to check listened status (returning detail without listened)",
				"episode_id", id.String(),
				"user_id", userID.String(),
				"error", err,
			)
		} else {
			result.Listened = &listened
		}
	}

	return response.Success(c, http.StatusOK, result)
}

// GetByPodcastID はポッドキャストのエピソード一覧を取得するハンドラーです。
// API 設計書に従い、各エピソードに average_rating / total_reviews を含み、total を返します。
// OptionalJWTAuth ミドルウェアの後に実行され、認証済みの場合は各エピソードの聴取状態（listened）も含みます。
// Stale-While-Revalidate 方式で、必要に応じて RSS フィードからエピソードを自動取得します。
// @Summary エピソード一覧取得
// @Description ポッドキャストIDに紐づくエピソード一覧を取得します。各エピソードに平均評価・レビュー件数を含みます。認証済みの場合は聴取状態も含みます。
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

	limit, offset := parsePagination(c)

	// OptionalJWTAuth で設定されたユーザーID（未認証なら nil）
	userID := mw.GetOptionalUserID(c)

	result, err := h.episodeUsecase.GetByPodcastIDWithAutoFetch(c.Request().Context(), podcastID, limit, offset, userID)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get episodes")
	}

	return response.Success(c, http.StatusOK, result)
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
