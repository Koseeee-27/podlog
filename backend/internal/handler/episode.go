package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/response"
	"github.com/kobayashikosei/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// EpisodeHandler はエピソード関連のHTTPハンドラーです。
type EpisodeHandler struct {
	episodeUsecase usecase.EpisodeUsecase
}

// NewEpisodeHandler は EpisodeHandler を生成します。
func NewEpisodeHandler(episodeUsecase usecase.EpisodeUsecase) *EpisodeHandler {
	return &EpisodeHandler{episodeUsecase: episodeUsecase}
}

// GetByID はエピソード詳細を取得するハンドラーです。
// @Summary エピソード詳細取得
// @Description エピソードIDから詳細情報を取得します
// @Tags episodes
// @Produce json
// @Param id path string true "エピソードID (UUID)"
// @Success 200 {object} model.Episode
// @Failure 404 {object} map[string]string
// @Router /episodes/{id} [get]
func (h *EpisodeHandler) GetByID(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid episode ID")
	}

	episode, err := h.episodeUsecase.GetByID(c.Request().Context(), id)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return response.Error(c, http.StatusNotFound, "episode not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get episode")
	}

	return response.Success(c, http.StatusOK, episode)
}

// GetByPodcastID はポッドキャストのエピソード一覧を取得するハンドラーです。
// @Summary エピソード一覧取得
// @Description ポッドキャストIDに紐づくエピソード一覧を取得します
// @Tags podcasts
// @Produce json
// @Param id path string true "ポッドキャストID (UUID)"
// @Param limit query int false "最大取得件数" default(20)
// @Param offset query int false "スキップ件数" default(0)
// @Success 200 {array} model.Episode
// @Failure 400 {object} map[string]string
// @Router /podcasts/{id}/episodes [get]
func (h *EpisodeHandler) GetByPodcastID(c echo.Context) error {
	podcastID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid podcast ID")
	}

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

	episodes, err := h.episodeUsecase.GetByPodcastID(c.Request().Context(), podcastID, limit, offset)
	if err != nil {
		return response.Error(c, http.StatusInternalServerError, "failed to get episodes")
	}

	return response.Success(c, http.StatusOK, episodes)
}
