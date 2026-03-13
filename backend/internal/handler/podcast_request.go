package handler

import (
	"errors"
	"net/http"

	mw "github.com/Koseeee-27/podlog/backend/internal/middleware"
	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// PodcastRequestHandler は番組追加リクエスト関連のHTTPハンドラーです。
type PodcastRequestHandler struct {
	podcastRequestUsecase usecase.PodcastRequestUsecase
}

// NewPodcastRequestHandler は PodcastRequestHandler を生成します。
func NewPodcastRequestHandler(podcastRequestUsecase usecase.PodcastRequestUsecase) *PodcastRequestHandler {
	return &PodcastRequestHandler{
		podcastRequestUsecase: podcastRequestUsecase,
	}
}

// Create は番組追加リクエストを作成するハンドラーです。
// @Summary 番組追加リクエスト
// @Description 認証ユーザーが番組の追加をリクエストします
// @Tags podcast-requests
// @Accept json
// @Produce json
// @Param body body usecase.CreatePodcastRequestInput true "リクエスト内容"
// @Success 201 {object} usecase.PodcastRequestResult
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Security BearerAuth
// @Router /podcasts/request [post]
func (h *PodcastRequestHandler) Create(c echo.Context) error {
	// JWT ミドルウェアが設定したユーザーIDを取得
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	// リクエストボディを構造体にバインド（JSON → Go の構造体に変換）
	var input usecase.CreatePodcastRequestInput
	if err := c.Bind(&input); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	// ユースケース層でバリデーション＋作成処理を実行
	result, err := h.podcastRequestUsecase.Create(c.Request().Context(), userID, input)
	if err != nil {
		return handlePodcastRequestError(c, err)
	}

	// 201 Created で結果を返す
	return response.Success(c, http.StatusCreated, result)
}

// handlePodcastRequestError は番組追加リクエスト操作のエラーをHTTPレスポンスに変換します。
// usecase 層が返すカスタムエラー型を errors.As で判定し、適切な HTTP ステータスを返します。
func handlePodcastRequestError(c echo.Context, err error) error {
	var validationErr *usecase.ValidationError
	if errors.As(err, &validationErr) {
		return response.Error(c, http.StatusBadRequest, err.Error())
	}

	return response.Error(c, http.StatusInternalServerError, "internal server error")
}
