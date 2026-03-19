package handler

import (
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// AdminHandler は管理用エンドポイントのHTTPハンドラーです。
// RSS フィードがない番組（Spotify 独占等）やそのエピソードを
// 手動で登録する際に使用します。
type AdminHandler struct {
	podcastUsecase usecase.PodcastUsecase
	episodeUsecase usecase.EpisodeUsecase
}

// NewAdminHandler は AdminHandler を生成します。
// podcastUsecase: 番組の手動登録に使用
// episodeUsecase: エピソードの手動登録に使用（既存の Create メソッドを再利用）
func NewAdminHandler(podcastUsecase usecase.PodcastUsecase, episodeUsecase usecase.EpisodeUsecase) *AdminHandler {
	return &AdminHandler{
		podcastUsecase: podcastUsecase,
		episodeUsecase: episodeUsecase,
	}
}

// CreatePodcast は番組を手動登録するハンドラーです。
// RSS フィードがない番組（Spotify 独占等）を管理者が直接登録できます。
// feed_url なしで登録可能です。
//
// @Summary 番組手動登録（管理用）
// @Description RSS フィードがない番組を手動で登録します。Spotify 独占配信など、通常の検索では追加できない番組に使用します。
// @Tags admin
// @Accept json
// @Produce json
// @Param body body usecase.CreatePodcastInput true "番組情報"
// @Success 201 {object} model.Podcast
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /admin/podcasts [post]
func (h *AdminHandler) CreatePodcast(c echo.Context) error {
	var input usecase.CreatePodcastInput
	if err := c.Bind(&input); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	podcast, err := h.podcastUsecase.Create(c.Request().Context(), input)
	if err != nil {
		var validationErr *usecase.ValidationError
		if errors.As(err, &validationErr) {
			return response.Error(c, http.StatusBadRequest, err.Error())
		}
		return response.Error(c, http.StatusInternalServerError, "failed to create podcast")
	}

	return response.Success(c, http.StatusCreated, podcast)
}

// CreateEpisode は指定した番組にエピソードを手動登録するハンドラーです。
// RSS フィードがない番組のエピソードを管理者が直接登録できます。
//
// @Summary エピソード手動登録（管理用）
// @Description 指定した番組にエピソードを手動で追加します。RSS フィードがない番組のエピソード登録に使用します。
// @Tags admin
// @Accept json
// @Produce json
// @Param id path string true "ポッドキャストID (UUID)"
// @Param body body usecase.CreateEpisodeInput true "エピソード情報"
// @Success 201 {object} model.Episode "新規作成"
// @Success 200 {object} model.Episode "既存エピソード返却（iTunes Track ID 重複）"
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /admin/podcasts/{id}/episodes [post]
func (h *AdminHandler) CreateEpisode(c echo.Context) error {
	// 1. パスパラメータからポッドキャスト ID を取得
	podcastID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid podcast ID")
	}

	// 2. 指定されたポッドキャストが存在するか確認
	// 存在しない番組にエピソードを追加しようとした場合は 404 を返す
	_, err = h.podcastUsecase.GetByID(c.Request().Context(), podcastID)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "podcast not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get podcast")
	}

	// 3. リクエストボディをバインド
	var input usecase.CreateEpisodeInput
	if err := c.Bind(&input); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	// 4. 既存の EpisodeUsecase.Create を再利用してエピソードを作成
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
