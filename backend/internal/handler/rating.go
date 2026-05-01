package handler

import (
	"errors"
	"net/http"

	"github.com/google/uuid"
	mw "github.com/Koseeee-27/podlog/backend/internal/middleware"
	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// RatingHandler は評価関連の HTTP ハンドラーです。
//
// 旧 ReviewHandler から rating レイヤーのみを切り出した形。コメントは別ハンドラ
// (CommentHandler、podlog#391 で実装予定) で扱います。
type RatingHandler struct {
	ratingUsecase usecase.RatingUsecase
}

// NewRatingHandler は RatingHandler を生成します。
func NewRatingHandler(ratingUsecase usecase.RatingUsecase) *RatingHandler {
	return &RatingHandler{ratingUsecase: ratingUsecase}
}

// Create は評価を投稿するハンドラーです。
// @Summary 評価投稿
// @Description 認証ユーザーがエピソードに評価（1〜5）を投稿します。既に投稿済みの場合は 409 を返します（FE は PUT /episodes/{id}/ratings/mine にフォールバック）。
// @Tags ratings
// @Accept json
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Param body body usecase.CreateRatingInput true "評価値"
// @Success 201 {object} model.Rating
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/ratings [post]
func (h *RatingHandler) Create(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	var input usecase.CreateRatingInput
	if err := c.Bind(&input); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	rating, err := h.ratingUsecase.Create(c.Request().Context(), userID, episodeID, input)
	if err != nil {
		return handleRatingError(c, err)
	}

	return response.Success(c, http.StatusCreated, rating)
}

// GetMyRating は指定エピソードに対する自分の評価を取得するハンドラーです。
// @Summary 自分の評価取得
// @Description 認証ユーザーが指定エピソードに投稿した評価を取得します。未投稿の場合は 404 を返します。
// @Tags ratings
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Success 200 {object} model.Rating
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/ratings/mine [get]
func (h *RatingHandler) GetMyRating(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	rating, err := h.ratingUsecase.GetMyRating(c.Request().Context(), userID, episodeID)
	if err != nil {
		return handleRatingError(c, err)
	}

	return response.Success(c, http.StatusOK, rating)
}

// Update は評価を更新するハンドラーです。
// @Summary 評価更新
// @Description 認証ユーザーの自分の評価を更新します
// @Tags ratings
// @Accept json
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Param body body usecase.UpdateRatingInput true "評価値"
// @Success 200 {object} model.Rating
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/ratings/mine [put]
func (h *RatingHandler) Update(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	var input usecase.UpdateRatingInput
	if err := c.Bind(&input); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	rating, err := h.ratingUsecase.Update(c.Request().Context(), userID, episodeID, input)
	if err != nil {
		return handleRatingError(c, err)
	}

	return response.Success(c, http.StatusOK, rating)
}

// Delete は評価を削除するハンドラーです。
// 同一ユーザーが投稿した感想（comments）には影響しません。
// @Summary 評価削除
// @Description 認証ユーザーの自分の評価のみを削除します（感想は別管理）。
// @Tags ratings
// @Param id path string true "エピソードID (UUID)"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/ratings/mine [delete]
func (h *RatingHandler) Delete(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	if err := h.ratingUsecase.Delete(c.Request().Context(), userID, episodeID); err != nil {
		return handleRatingError(c, err)
	}

	return c.NoContent(http.StatusNoContent)
}

// GetEpisodeStats はエピソードの評価集計を取得するハンドラーです。
// @Summary エピソードの評価集計
// @Description エピソードの平均評価・総件数・星別分布を取得します
// @Tags ratings
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Success 200 {object} usecase.EpisodeRatingStatsResult
// @Failure 400 {object} map[string]string
// @Router /episodes/{id}/ratings [get]
func (h *RatingHandler) GetEpisodeStats(c echo.Context) error {
	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	result, err := h.ratingUsecase.GetEpisodeStats(c.Request().Context(), episodeID)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get episode rating stats")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetUsernameStats はユーザーの評価統計サマリーを取得するハンドラーです。
// @Summary ユーザーの評価統計サマリー（公開）
// @Description ユーザー名を指定して評価の統計値（平均・総件数・星別分布）を取得します
// @Tags ratings
// @Produce json
// @Param username path string true "ユーザー名"
// @Success 200 {object} usecase.UserRatingStatsResult
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /users/{username}/ratings/stats [get]
func (h *RatingHandler) GetUsernameStats(c echo.Context) error {
	username := c.Param("username")
	if username == "" {
		return response.Error(c, http.StatusBadRequest, "username is required")
	}

	result, err := h.ratingUsecase.GetUsernameStats(c.Request().Context(), username)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "user not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get user rating stats")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetPodcastRating はポッドキャストの平均評価を取得するハンドラーです。
// @Summary ポッドキャスト平均評価
// @Description ポッドキャストに紐づく全エピソードの評価から平均評価と総件数を集計します
// @Tags ratings
// @Produce json
// @Param id path string true "ポッドキャストID (UUID)"
// @Success 200 {object} usecase.PodcastRatingResult
// @Failure 400 {object} map[string]string
// @Router /podcasts/{id}/rating [get]
func (h *RatingHandler) GetPodcastRating(c echo.Context) error {
	podcastID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid podcast ID")
	}

	result, err := h.ratingUsecase.GetPodcastRating(c.Request().Context(), podcastID)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get podcast rating")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetMyRatings は認証ユーザー自身の評価一覧を取得するハンドラーです。
// @Summary 自分の評価一覧
// @Description 認証ユーザーが投稿した評価をエピソード・番組情報付きで一覧取得します（設定ページ等での確認用途）。
// @Tags ratings
// @Produce json
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {object} usecase.MyRatingListResult
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /users/me/ratings [get]
func (h *RatingHandler) GetMyRatings(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	limit, offset := parsePagination(c)

	result, err := h.ratingUsecase.GetByUserID(c.Request().Context(), userID, limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get ratings")
	}

	return response.Success(c, http.StatusOK, result)
}

// handleRatingError は評価操作の usecase エラーを HTTP レスポンスに変換します。
// errors.As でカスタムエラー型を判定し、対応するステータスコードに変換します。
func handleRatingError(c echo.Context, err error) error {
	var notFoundErr *usecase.NotFoundError
	var validationErr *usecase.ValidationError
	var conflictErr *usecase.ConflictError

	if errors.As(err, &notFoundErr) {
		return response.Error(c, http.StatusNotFound, err.Error())
	}
	if errors.As(err, &validationErr) {
		return response.Error(c, http.StatusBadRequest, err.Error())
	}
	if errors.As(err, &conflictErr) {
		return response.Error(c, http.StatusConflict, err.Error())
	}
	return response.Error(c, http.StatusInternalServerError, "internal server error")
}
