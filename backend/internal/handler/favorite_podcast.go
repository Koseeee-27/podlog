package handler

import (
	"errors"
	"net/http"

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
