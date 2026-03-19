package handler

import (
	"bytes"
	"errors"
	"io"
	"net/http"

	mw "github.com/Koseeee-27/podlog/backend/internal/middleware"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// UserHandler はユーザー関連のHTTPハンドラーです。
// usecase を呼び出してビジネスロジックを実行し、結果をHTTPレスポンスとして返します。
type UserHandler struct {
	userUsecase  usecase.UserUsecase
	adminUserIDs []string // 管理者ユーザー ID のリスト（GET /users/me で is_admin を返すために使用）
}

// NewUserHandler は UserHandler の新しいインスタンスを生成します。
// adminUserIDs は管理者ユーザー ID のリストで、GetMyProfile のレスポンスに is_admin を含めるために使います。
func NewUserHandler(userUsecase usecase.UserUsecase, adminUserIDs []string) *UserHandler {
	return &UserHandler{userUsecase: userUsecase, adminUserIDs: adminUserIDs}
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
// レスポンスには is_admin フィールドが含まれ、管理者かどうかを判定できます。
// @Summary 自分のプロフィール取得
// @Description 認証済みユーザー自身のプロフィールを取得します。is_admin フィールドで管理者かどうかを判定できます。
// @Tags users
// @Produce json
// @Success 200 {object} model.MyProfileResponse
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

	// mw.IsAdmin でユーザー ID が管理者リストに含まれるか判定し、
	// is_admin フィールドを含むレスポンスを返す
	isAdmin := mw.IsAdmin(userID, h.adminUserIDs)
	return response.Success(c, http.StatusOK, user.ToMyProfileResponse(isAdmin))
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

// UploadAvatar はアバター画像をアップロードするハンドラーです。
// multipart/form-data で送信された画像ファイルを受け取り、ストレージにアップロードします。
// @Summary アバター画像アップロード
// @Description 認証済みユーザーのアバター画像をアップロードします。JPEG/PNG、最大2MB。
// @Tags users
// @Accept multipart/form-data
// @Produce json
// @Param avatar formData file true "アバター画像（JPEG/PNG、最大2MB）"
// @Success 200 {object} model.AvatarUploadResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /users/me/avatar [post]
func (h *UserHandler) UploadAvatar(c echo.Context) error {
	// 1. 認証ユーザーの ID を取得
	userID, err := mw.GetUserID(c)
	if err != nil {
		return response.Error(c, http.StatusUnauthorized, "unauthorized")
	}

	// 2. multipart/form-data からファイルを取得
	// c.FormFile はリクエストの "avatar" フィールドからアップロードされたファイルを取得する
	fileHeader, err := c.FormFile("avatar")
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "avatar file is required")
	}

	// 3. ファイルを開く
	file, err := fileHeader.Open()
	if err != nil {
		return response.Error(c, http.StatusBadRequest, "failed to read avatar file")
	}
	defer file.Close()

	// 4. Content-Type を実データから検証する（セキュリティ対策）
	// ブラウザが送る Content-Type ヘッダーは偽装可能なため、
	// ファイルの先頭 512 バイトを読み取って http.DetectContentType で判定する
	headBuf := make([]byte, 512)
	n, err := file.Read(headBuf)
	if err != nil && err != io.EOF {
		return response.Error(c, http.StatusBadRequest, "failed to read avatar file")
	}
	contentType := http.DetectContentType(headBuf[:n])

	// 読み取った分を元のストリームに結合して usecase に渡す
	// io.MultiReader: 複数の Reader を連結して1つの Reader として扱えるユーティリティ
	// bytes.NewReader で先頭バイトを Reader に変換し、残りの file と結合する
	bodyReader := io.MultiReader(bytes.NewReader(headBuf[:n]), file)

	// 5. usecase を呼び出してバリデーション + アップロード + DB 更新を実行
	avatarURL, err := h.userUsecase.UploadAvatar(c.Request().Context(), userID, bodyReader, fileHeader.Size, contentType)
	if err != nil {
		var notFoundErr *usecase.NotFoundError
		var validationErr *usecase.ValidationError
		if errors.As(err, &notFoundErr) {
			return response.Error(c, http.StatusNotFound, "profile not found")
		}
		if errors.As(err, &validationErr) {
			return response.Error(c, http.StatusBadRequest, err.Error())
		}
		return response.Error(c, http.StatusInternalServerError, "failed to upload avatar")
	}

	// 6. アップロード後の URL を返す
	return response.Success(c, http.StatusOK, model.AvatarUploadResponse{
		AvatarURL: avatarURL,
	})
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
