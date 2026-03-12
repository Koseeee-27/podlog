package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	mw "github.com/kobayashikosei/podlog/backend/internal/middleware"
	"github.com/kobayashikosei/podlog/backend/internal/response"
	"github.com/kobayashikosei/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// ReviewHandler はレビュー関連のHTTPハンドラーです。
type ReviewHandler struct {
	reviewUsecase usecase.ReviewUsecase
}

// NewReviewHandler は ReviewHandler を生成します。
func NewReviewHandler(reviewUsecase usecase.ReviewUsecase) *ReviewHandler {
	return &ReviewHandler{
		reviewUsecase: reviewUsecase,
	}
}

// Create はレビューを投稿するハンドラーです。
// @Summary レビュー投稿
// @Description 認証ユーザーがエピソードにレビューを投稿します
// @Tags reviews
// @Accept json
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Param body body usecase.CreateReviewInput true "レビュー内容"
// @Success 201 {object} model.Review
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/reviews [post]
func (h *ReviewHandler) Create(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	var input usecase.CreateReviewInput
	if err := c.Bind(&input); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	review, err := h.reviewUsecase.Create(c.Request().Context(), userID, episodeID, input)
	if err != nil {
		return handleReviewError(c, err)
	}

	return response.Success(c, http.StatusCreated, review)
}

// GetMyReview は指定エピソードに対する自分のレビューを取得するハンドラーです。
// @Summary 自分のレビュー取得
// @Description 認証ユーザーが指定エピソードに投稿したレビューを取得します。未投稿の場合は 404 を返します。
// @Tags reviews
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Success 200 {object} usecase.MyReviewResult
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/reviews/mine [get]
func (h *ReviewHandler) GetMyReview(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	result, err := h.reviewUsecase.GetMyReview(c.Request().Context(), userID, episodeID)
	if err != nil {
		return handleReviewError(c, err)
	}

	return response.Success(c, http.StatusOK, result)
}

// Update はレビューを更新するハンドラーです。
// @Summary レビュー更新
// @Description 認証ユーザーの自分のレビューを更新します
// @Tags reviews
// @Accept json
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Param body body usecase.UpdateReviewInput true "レビュー内容"
// @Success 200 {object} model.Review
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/reviews/mine [put]
func (h *ReviewHandler) Update(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	var input usecase.UpdateReviewInput
	if err := c.Bind(&input); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	review, err := h.reviewUsecase.Update(c.Request().Context(), userID, episodeID, input)
	if err != nil {
		return handleReviewError(c, err)
	}

	return response.Success(c, http.StatusOK, review)
}

// Delete はレビューを削除するハンドラーです。
// @Summary レビュー削除
// @Description 認証ユーザーの自分のレビューを削除します
// @Tags reviews
// @Param id path string true "エピソードID (UUID)"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/reviews/mine [delete]
func (h *ReviewHandler) Delete(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	err = h.reviewUsecase.Delete(c.Request().Context(), userID, episodeID)
	if err != nil {
		return handleReviewError(c, err)
	}

	return c.NoContent(http.StatusNoContent)
}

// GetByEpisodeID はエピソードのレビュー一覧を取得するハンドラーです。
// @Summary エピソードのレビュー一覧
// @Description エピソードに投稿されたレビュー一覧を取得します
// @Tags reviews
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {object} usecase.ReviewListResult
// @Failure 400 {object} map[string]string
// @Router /episodes/{id}/reviews [get]
func (h *ReviewHandler) GetByEpisodeID(c echo.Context) error {
	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	limit, offset := parsePagination(c)

	result, err := h.reviewUsecase.GetByEpisodeID(c.Request().Context(), episodeID, limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get reviews")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetPodcastRating はポッドキャストの平均評価を取得するハンドラーです。
// @Summary ポッドキャスト平均評価
// @Description ポッドキャストの全エピソードの平均評価を取得します
// @Tags reviews
// @Produce json
// @Param id path string true "ポッドキャストID (UUID)"
// @Success 200 {object} usecase.PodcastRatingResult
// @Failure 400 {object} map[string]string
// @Router /podcasts/{id}/rating [get]
func (h *ReviewHandler) GetPodcastRating(c echo.Context) error {
	podcastID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid podcast ID")
	}

	result, err := h.reviewUsecase.GetPodcastRating(c.Request().Context(), podcastID)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get podcast rating")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetMyReviews はユーザーのレビュー一覧を取得するハンドラーです。
// @Summary 自分のレビュー一覧
// @Description 認証ユーザーのレビュー一覧をエピソード・ポッドキャスト情報付きで取得します
// @Tags reviews
// @Produce json
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {object} usecase.UserReviewListResult
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /users/me/reviews [get]
func (h *ReviewHandler) GetMyReviews(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	limit, offset := parsePagination(c)

	result, err := h.reviewUsecase.GetByUserID(c.Request().Context(), userID, limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get reviews")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetUserReviews はユーザー名で指定したユーザーのレビュー一覧を取得するハンドラーです。
// 認証不要の公開 API です。
// @Summary ユーザーのレビュー一覧（公開）
// @Description ユーザー名を指定してレビュー一覧をエピソード・ポッドキャスト情報付きで取得します
// @Tags reviews
// @Produce json
// @Param username path string true "ユーザー名"
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {object} usecase.UserReviewListResult
// @Failure 404 {object} map[string]string
// @Router /users/{username}/reviews [get]
func (h *ReviewHandler) GetUserReviews(c echo.Context) error {
	username := c.Param("username")
	if username == "" {
		return response.Error(c, http.StatusBadRequest, "username is required")
	}

	limit, offset := parsePagination(c)

	result, err := h.reviewUsecase.GetByUsername(c.Request().Context(), username, limit, offset)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "user not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get reviews")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetTimeline は全ユーザーの最新レビューのタイムラインを取得するハンドラーです。
// @Summary タイムライン
// @Description 全ユーザーの最新レビューを時系列で取得します
// @Tags timeline
// @Produce json
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {object} usecase.TimelineResult
// @Router /timeline [get]
func (h *ReviewHandler) GetTimeline(c echo.Context) error {
	limit, offset := parsePagination(c)

	result, err := h.reviewUsecase.GetTimeline(c.Request().Context(), limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get timeline")
	}

	return response.Success(c, http.StatusOK, result)
}

// handleReviewError はレビュー操作のエラーをHTTPレスポンスに変換します。
func handleReviewError(c echo.Context, err error) error {
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

// parsePagination はクエリパラメータから limit と offset を取得します。
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

	return limit, offset
}
