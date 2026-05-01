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

// CommentHandler は感想（comments）関連の HTTP ハンドラーです。
//
// rating と異なり 1ユーザー1エピソード=複数件可のため、Create で 409 を返さず
// 素直に 201 を返します。Update / Delete はコメント ID 単位で操作し、所有者チェック
// 失敗時は 403、リソース不存在は 404 と区別します（api-design.md 準拠）。
type CommentHandler struct {
	commentUsecase usecase.CommentUsecase
}

// NewCommentHandler は CommentHandler を生成します。
func NewCommentHandler(commentUsecase usecase.CommentUsecase) *CommentHandler {
	return &CommentHandler{commentUsecase: commentUsecase}
}

// Create は感想を投稿するハンドラーです。
//
// 1ユーザー1エピソード=複数件可（既存があってもエラーにしない）。
// @Summary 感想投稿
// @Description 認証ユーザーがエピソードに感想（1〜1000文字）を投稿します。同一ユーザーが同一エピソードに複数件投稿可能です。
// @Tags comments
// @Accept json
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Param body body usecase.CreateCommentInput true "感想本文"
// @Success 201 {object} model.Comment
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/comments [post]
func (h *CommentHandler) Create(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	var input usecase.CreateCommentInput
	if err := c.Bind(&input); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	comment, err := h.commentUsecase.Create(c.Request().Context(), userID, episodeID, input)
	if err != nil {
		return handleCommentError(c, err)
	}

	return response.Success(c, http.StatusCreated, comment)
}

// GetByEpisodeID はエピソードに紐づく感想一覧を取得するハンドラーです（公開）。
// @Summary エピソードの感想一覧
// @Description エピソードに投稿された感想を新しい順で取得します。認証不要。
// @Tags comments
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {object} usecase.EpisodeCommentListResult
// @Failure 400 {object} map[string]string
// @Router /episodes/{id}/comments [get]
func (h *CommentHandler) GetByEpisodeID(c echo.Context) error {
	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	limit, offset := parsePagination(c)

	result, err := h.commentUsecase.GetByEpisodeID(c.Request().Context(), episodeID, limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get comments")
	}

	return response.Success(c, http.StatusOK, result)
}

// Update は自分の感想を更新するハンドラーです。
//
// 所有者チェック失敗時は 403、コメント不存在は 404 を返します。
// @Summary 感想更新
// @Description 認証ユーザーが自分の感想本文を更新します。他ユーザーの感想を更新しようとした場合は 403 を返します。
// @Tags comments
// @Accept json
// @Produce json
// @Param id path string true "コメントID (UUID)"
// @Param body body usecase.UpdateCommentInput true "感想本文"
// @Success 200 {object} model.Comment
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /comments/{id} [put]
func (h *CommentHandler) Update(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	commentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid comment ID")
	}

	var input usecase.UpdateCommentInput
	if err := c.Bind(&input); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	comment, err := h.commentUsecase.Update(c.Request().Context(), commentID, userID, input)
	if err != nil {
		return handleCommentError(c, err)
	}

	return response.Success(c, http.StatusOK, comment)
}

// Delete は自分の感想を削除するハンドラーです。
//
// 所有者チェック失敗時は 403、コメント不存在は 404 を返します。
// @Summary 感想削除
// @Description 認証ユーザーが自分の感想を削除します。他ユーザーの感想を削除しようとした場合は 403 を返します。
// @Tags comments
// @Param id path string true "コメントID (UUID)"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /comments/{id} [delete]
func (h *CommentHandler) Delete(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	commentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid comment ID")
	}

	if err := h.commentUsecase.Delete(c.Request().Context(), commentID, userID); err != nil {
		return handleCommentError(c, err)
	}

	return c.NoContent(http.StatusNoContent)
}

// GetMyComments は認証ユーザー自身の感想一覧を取得するハンドラーです。
// @Summary 自分の感想一覧
// @Description 認証ユーザーが投稿した感想をエピソード・番組情報付きで一覧取得します。
// @Tags comments
// @Produce json
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {object} usecase.UserCommentListResult
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /users/me/comments [get]
func (h *CommentHandler) GetMyComments(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	limit, offset := parsePagination(c)

	result, err := h.commentUsecase.GetByUserID(c.Request().Context(), userID, limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get comments")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetByUsername はユーザー名で公開感想一覧を取得するハンドラーです（公開）。
// @Summary ユーザーの感想一覧（公開）
// @Description ユーザー名を指定して公開感想を一覧取得します。
// @Tags comments
// @Produce json
// @Param username path string true "ユーザー名"
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {object} usecase.UserCommentListResult
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /users/{username}/comments [get]
func (h *CommentHandler) GetByUsername(c echo.Context) error {
	username := c.Param("username")
	if username == "" {
		return response.Error(c, http.StatusBadRequest, "username is required")
	}

	limit, offset := parsePagination(c)

	result, err := h.commentUsecase.GetByUsername(c.Request().Context(), username, limit, offset)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "user not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get comments")
	}

	return response.Success(c, http.StatusOK, result)
}

// GetTimeline は全ユーザーの最新感想を時系列で取得するハンドラーです（公開）。
// @Summary タイムライン
// @Description 全ユーザーの最新の感想を時系列で取得します（comment ベース）。認証不要。
// @Tags comments
// @Produce json
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {object} usecase.TimelineResult
// @Router /timeline [get]
func (h *CommentHandler) GetTimeline(c echo.Context) error {
	limit, offset := parsePagination(c)

	result, err := h.commentUsecase.GetTimeline(c.Request().Context(), limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get timeline")
	}

	return response.Success(c, http.StatusOK, result)
}

// handleCommentError は感想操作の usecase エラーを HTTP レスポンスに変換します。
//
// errors.As でカスタムエラー型を判定して、対応するステータスコードに変換します。
// `ForbiddenError` は他のリソース（rating 等）では未使用ですが、comment では
// 「他人のコメント = 403」を区別するために使います（api-design.md 準拠）。
func handleCommentError(c echo.Context, err error) error {
	var notFoundErr *usecase.NotFoundError
	var validationErr *usecase.ValidationError
	var forbiddenErr *usecase.ForbiddenError

	if errors.As(err, &notFoundErr) {
		return response.Error(c, http.StatusNotFound, err.Error())
	}
	if errors.As(err, &validationErr) {
		return response.Error(c, http.StatusBadRequest, err.Error())
	}
	if errors.As(err, &forbiddenErr) {
		return response.Error(c, http.StatusForbidden, err.Error())
	}
	return response.Error(c, http.StatusInternalServerError, "internal server error")
}
