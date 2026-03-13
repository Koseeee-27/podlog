package handler

import (
	"errors"
	"net/http"

	mw "github.com/kobayashikosei/podlog/backend/internal/middleware"
	"github.com/kobayashikosei/podlog/backend/internal/response"
	"github.com/kobayashikosei/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// FavoritePodcastHandler は好きな番組関連のHTTPハンドラーです。
type FavoritePodcastHandler struct {
	favPodcastUsecase usecase.FavoritePodcastUsecase
}

// NewFavoritePodcastHandler は FavoritePodcastHandler を生成します。
func NewFavoritePodcastHandler(favPodcastUsecase usecase.FavoritePodcastUsecase) *FavoritePodcastHandler {
	return &FavoritePodcastHandler{
		favPodcastUsecase: favPodcastUsecase,
	}
}

// GetUserFavoritePodcasts はユーザーの好きな番組一覧を取得するハンドラーです。
// 認証不要の公開 API です。
// @Summary ユーザーの好きな番組一覧（公開）
// @Description ユーザー名を指定して好きな番組一覧を取得します。ユーザーページの「好きな番組」セクションで使用します。
// @Tags favorite-podcasts
// @Produce json
// @Param username path string true "ユーザー名"
// @Success 200 {object} usecase.FavoritePodcastListResult
// @Failure 404 {object} map[string]string
// @Router /users/{username}/favorite-podcasts [get]
func (h *FavoritePodcastHandler) GetUserFavoritePodcasts(c echo.Context) error {
	username := c.Param("username")
	if username == "" {
		return response.Error(c, http.StatusBadRequest, "username is required")
	}

	result, err := h.favPodcastUsecase.GetByUsername(c.Request().Context(), username)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "user not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get favorite podcasts")
	}

	return response.Success(c, http.StatusOK, result)
}

// UpdateFavoritePodcasts は好きな番組を一括更新するハンドラーです。
// 認証が必要です。既存のリストを全て置き換えます。
// @Summary 好きな番組を一括更新
// @Description プロフィール編集画面で好きな番組リストを保存します。既存のリストを全て置き換えます。
// @Tags favorite-podcasts
// @Accept json
// @Produce json
// @Param body body usecase.UpdateFavoritePodcastsInput true "好きな番組の podcast_id リスト"
// @Success 200 {object} usecase.FavoritePodcastListResult
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /users/me/favorite-podcasts [put]
func (h *FavoritePodcastHandler) UpdateFavoritePodcasts(c echo.Context) error {
	// 1. JWT から認証ユーザー ID を取得
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	// 2. リクエストボディをバインド（JSON → 構造体）
	var input usecase.UpdateFavoritePodcastsInput
	if err := c.Bind(&input); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	// 3. ユースケースを呼び出して一括更新
	result, err := h.favPodcastUsecase.UpdateFavorites(c.Request().Context(), userID, input.PodcastIDs)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, notFoundErr.Error())
		}
		var validationErr *usecase.ValidationError
		if errors.As(err, &validationErr) {
			return response.Error(c, http.StatusBadRequest, err.Error())
		}
		return response.Error(c, http.StatusInternalServerError, "failed to update favorite podcasts")
	}

	return response.Success(c, http.StatusOK, result)
}
