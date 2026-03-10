package handler

import (
	"errors"
	"net/http"

	"github.com/google/uuid"
	mw "github.com/kobayashikosei/podlog/backend/internal/middleware"
	"github.com/kobayashikosei/podlog/backend/internal/response"
	"github.com/kobayashikosei/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// ListeningRecordHandler は聴取記録関連のHTTPハンドラーです。
type ListeningRecordHandler struct {
	listeningRecordUsecase usecase.ListeningRecordUsecase
}

// NewListeningRecordHandler は ListeningRecordHandler を生成します。
func NewListeningRecordHandler(listeningRecordUsecase usecase.ListeningRecordUsecase) *ListeningRecordHandler {
	return &ListeningRecordHandler{
		listeningRecordUsecase: listeningRecordUsecase,
	}
}

// Create は聴取記録を追加するハンドラーです。
// @Summary 聴取記録追加
// @Description 認証ユーザーが指定エピソードを「聴いた」として記録します
// @Tags listening-records
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Success 201 {object} model.ListeningRecord
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/listen [post]
func (h *ListeningRecordHandler) Create(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	record, err := h.listeningRecordUsecase.Create(c.Request().Context(), userID, episodeID)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		var conflictErr *usecase.ConflictError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, err.Error())
		}
		if errors.As(err, &conflictErr) {
			return response.Error(c, http.StatusConflict, err.Error())
		}
		return response.Error(c, http.StatusInternalServerError, "failed to create listening record")
	}

	return response.Success(c, http.StatusCreated, record)
}

// Delete は聴取記録を削除するハンドラーです。
// @Summary 聴取記録削除
// @Description 認証ユーザーの聴取記録を削除します
// @Tags listening-records
// @Param id path string true "エピソードID (UUID)"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/listen [delete]
func (h *ListeningRecordHandler) Delete(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	err = h.listeningRecordUsecase.Delete(c.Request().Context(), userID, episodeID)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, err.Error())
		}
		return response.Error(c, http.StatusInternalServerError, "failed to delete listening record")
	}

	return c.NoContent(http.StatusNoContent)
}

// GetStatus は聴取状態を確認するハンドラーです。
// @Summary 聴取状態確認
// @Description 認証ユーザーがそのエピソードを聴いたかどうか確認します
// @Tags listening-records
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /episodes/{id}/listen [get]
func (h *ListeningRecordHandler) GetStatus(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	episodeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	listened, record, err := h.listeningRecordUsecase.GetStatus(c.Request().Context(), userID, episodeID)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get listening status")
	}

	result := map[string]interface{}{
		"listened": listened,
	}
	if record != nil {
		result["listened_at"] = record.CreatedAt
	}

	return response.Success(c, http.StatusOK, result)
}

// GetMyRecords はユーザーの聴取履歴一覧を取得するハンドラーです。
// @Summary 聴取履歴一覧
// @Description 認証ユーザーの聴取履歴をエピソード・ポッドキャスト情報付きで取得します
// @Tags listening-records
// @Produce json
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {object} usecase.ListeningRecordListResult
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /users/me/listening-records [get]
func (h *ListeningRecordHandler) GetMyRecords(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	limit, offset := parsePagination(c)

	result, err := h.listeningRecordUsecase.GetByUserID(c.Request().Context(), userID, limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get listening records")
	}

	return response.Success(c, http.StatusOK, result)
}
