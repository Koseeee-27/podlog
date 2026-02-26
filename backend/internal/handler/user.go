package handler

import (
	"errors"
	"net/http"

	mw "github.com/kobayashikosei/podlog/backend/internal/middleware"
	"github.com/kobayashikosei/podlog/backend/internal/model"
	"github.com/kobayashikosei/podlog/backend/internal/response"
	"github.com/kobayashikosei/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// UserHandler はユーザー関連のHTTPハンドラーです。
// usecase を呼び出してビジネスロジックを実行し、結果をHTTPレスポンスとして返します。
type UserHandler struct {
	userUsecase usecase.UserUsecase
}

// NewUserHandler は UserHandler の新しいインスタンスを生成します。
func NewUserHandler(userUsecase usecase.UserUsecase) *UserHandler {
	return &UserHandler{userUsecase: userUsecase}
}

// CreateProfile はプロフィール作成のハンドラーです。
// @Summary プロフィール作成
// @Description Supabase Auth で認証後、初回プロフィールを作成します
// @Tags users
// @Accept json
// @Produce json
// @Param body body model.CreateProfileRequest true "プロフィール情報"
// @Success 201 {object} model.UserPublicProfile
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Security BearerAuth
// @Router /users/profile [post]
func (h *UserHandler) CreateProfile(c echo.Context) error {
	// 1. JWT ミドルウェアがセットしたユーザーIDを取得
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	// 2. リクエストボディを構造体にバインド（JSONをGoの構造体に変換）
	var req model.CreateProfileRequest
	if err := c.Bind(&req); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	// 3. ユースケースを呼び出し
	user, err := h.userUsecase.CreateProfile(c.Request().Context(), userID, req)
	if err != nil {
		var conflictErr *usecase.ConflictError
		var validationErr *usecase.ValidationError
		if errors.As(err, &conflictErr) {
			return response.Error(c, http.StatusConflict, err.Error())
		}
		if errors.As(err, &validationErr) {
			return response.Error(c, http.StatusBadRequest, err.Error())
		}
		return response.Error(c, http.StatusInternalServerError, "failed to create profile")
	}

	// 4. 公開プロフィール形式で返却（内部情報を隠す）
	return response.Success(c, http.StatusCreated, user.ToPublicProfile())
}

// GetMyProfile は自分のプロフィールを取得するハンドラーです。
// @Summary 自分のプロフィール取得
// @Description 認証済みユーザー自身のプロフィールを取得します
// @Tags users
// @Produce json
// @Success 200 {object} model.User
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /users/me [get]
func (h *UserHandler) GetMyProfile(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	user, err := h.userUsecase.GetMyProfile(c.Request().Context(), userID)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "profile not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get profile")
	}

	return response.Success(c, http.StatusOK, user)
}

// UpdateMyProfile はプロフィール更新のハンドラーです。
// @Summary プロフィール更新
// @Description 認証済みユーザーのプロフィールを更新します
// @Tags users
// @Accept json
// @Produce json
// @Param body body model.UpdateProfileRequest true "更新情報"
// @Success 200 {object} model.UserPublicProfile
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /users/me [put]
func (h *UserHandler) UpdateMyProfile(c echo.Context) error {
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	var req model.UpdateProfileRequest
	if err := c.Bind(&req); err != nil {
		return response.Error(c, http.StatusBadRequest, "invalid request body")
	}

	user, err := h.userUsecase.UpdateMyProfile(c.Request().Context(), userID, req)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		var validationErr *usecase.ValidationError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "profile not found")
		}
		if errors.As(err, &validationErr) {
			return response.Error(c, http.StatusBadRequest, err.Error())
		}
		return response.Error(c, http.StatusInternalServerError, "failed to update profile")
	}

	return response.Success(c, http.StatusOK, user.ToPublicProfile())
}

// GetPublicProfile は公開プロフィールを取得するハンドラーです。
// @Summary 公開プロフィール取得
// @Description ユーザー名から公開プロフィールを取得します
// @Tags users
// @Produce json
// @Param username path string true "ユーザー名"
// @Success 200 {object} model.UserPublicProfile
// @Failure 404 {object} map[string]string
// @Router /users/{username} [get]
func (h *UserHandler) GetPublicProfile(c echo.Context) error {
	username := c.Param("username")
	if username == "" {
		return response.Error(c, http.StatusBadRequest, "username is required")
	}

	user, err := h.userUsecase.GetPublicProfile(c.Request().Context(), username)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "user not found")
		}
		return response.Error(c, http.StatusInternalServerError, "failed to get profile")
	}

	return response.Success(c, http.StatusOK, user.ToPublicProfile())
}
