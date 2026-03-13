// Package usecase はビジネスロジック層です。
// handler からリクエストデータを受け取り、repository を使ってデータを操作します。
// バリデーションやビジネスルールの判定はここで行います。
package usecase

import (
	"context"
	"fmt"
	"io"
	"regexp"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
	"github.com/Koseeee-27/podlog/backend/internal/storage"
)

// usernameRegex はユーザー名のバリデーションに使う正規表現です。
// 英数字とアンダースコアのみ、3〜30文字を許可します。
var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)

// avatarMaxSize はアバター画像の最大サイズ（2MB）です。
const avatarMaxSize = 2 * 1024 * 1024

// avatarBucket はアバター画像を保存する Supabase Storage のバケット名です。
const avatarBucket = "avatars"

// allowedContentTypes はアップロード可能な画像の MIME タイプです。
var allowedContentTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
}

// UserUsecase はユーザーに関するビジネスロジックのインターフェースです。
type UserUsecase interface {
	CreateProfile(ctx context.Context, userID uuid.UUID, req model.CreateProfileRequest) (*model.User, error)
	GetMyProfile(ctx context.Context, userID uuid.UUID) (*model.User, error)
	UpdateMyProfile(ctx context.Context, userID uuid.UUID, req model.UpdateProfileRequest) (*model.User, error)
	GetPublicProfile(ctx context.Context, username string) (*model.User, error)
	UploadAvatar(ctx context.Context, userID uuid.UUID, file io.Reader, fileSize int64, contentType string) (string, error)
}

// userUsecase は UserUsecase の実装です。
type userUsecase struct {
	userRepo    repository.UserRepository
	fileStorage storage.FileStorage
}

// NewUserUsecase は UserUsecase の新しいインスタンスを生成します。
// fileStorage はアバター画像のアップロードに使用します。
func NewUserUsecase(userRepo repository.UserRepository, fileStorage storage.FileStorage) UserUsecase {
	return &userUsecase{userRepo: userRepo, fileStorage: fileStorage}
}

// CreateProfile はプロフィールを新規作成します。
// Supabase Auth で認証後、初回ログイン時にこのAPIを呼んでプロフィールを作成します。
func (u *userUsecase) CreateProfile(ctx context.Context, userID uuid.UUID, req model.CreateProfileRequest) (*model.User, error) {
	// バリデーション: ユーザー名の形式チェック
	if !usernameRegex.MatchString(req.Username) {
		return nil, &ValidationError{Message: "invalid username: must be 3-30 alphanumeric characters or underscores"}
	}

	// バリデーション: 表示名の長さチェック
	if len(req.DisplayName) == 0 || len(req.DisplayName) > 50 {
		return nil, &ValidationError{Message: "display_name must be between 1 and 50 characters"}
	}

	// 既に同じユーザー名が使われていないか確認
	exists, err := u.userRepo.ExistsByUsername(ctx, req.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to check username: %w", err)
	}
	if exists {
		return nil, &ConflictError{Message: "username already taken"}
	}

	// 既にプロフィールが作成されていないか確認
	existing, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing profile: %w", err)
	}
	if existing != nil {
		return nil, &ConflictError{Message: "profile already exists"}
	}

	// ユーザーを作成
	user := &model.User{
		ID:          userID,
		Username:    req.Username,
		DisplayName: req.DisplayName,
		AvatarURL:   req.AvatarURL,
		Bio:         req.Bio,
	}

	if err := u.userRepo.Create(ctx, user); err != nil {
		// 並行リクエストで同じユーザー名が先に作成された場合（TOCTOU）
		// DB の UNIQUE 制約違反をキャッチして適切なエラーを返す
		if isUniqueViolation(err) {
			return nil, &ConflictError{Message: "username already taken"}
		}
		return nil, fmt.Errorf("failed to create profile: %w", err)
	}

	// 作成したユーザーを再取得して返す（created_at 等を含めるため）
	created, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get created profile: %w", err)
	}

	return created, nil
}

// GetMyProfile は認証済みユーザー自身のプロフィールを取得します。
func (u *userUsecase) GetMyProfile(ctx context.Context, userID uuid.UUID) (*model.User, error) {
	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}
	if user == nil {
		return nil, &NotFoundError{Resource: "profile"}
	}
	return user, nil
}

// UpdateMyProfile はプロフィールを更新します。
// リクエストで送られたフィールドだけを更新します（nil のフィールドは既存値を維持）。
func (u *userUsecase) UpdateMyProfile(ctx context.Context, userID uuid.UUID, req model.UpdateProfileRequest) (*model.User, error) {
	// 現在のプロフィールを取得
	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}
	if user == nil {
		return nil, &NotFoundError{Resource: "profile"}
	}

	// 送られたフィールドだけ更新
	if req.DisplayName != nil {
		if len(*req.DisplayName) == 0 || len(*req.DisplayName) > 50 {
			return nil, &ValidationError{Message: "display_name must be between 1 and 50 characters"}
		}
		user.DisplayName = *req.DisplayName
	}
	if req.AvatarURL != nil {
		user.AvatarURL = req.AvatarURL
	}
	if req.Bio != nil {
		user.Bio = req.Bio
	}

	if err := u.userRepo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	// 更新後のデータを再取得して返す
	updated, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated profile: %w", err)
	}

	return updated, nil
}

// GetPublicProfile はユーザー名から公開プロフィールを取得します。
func (u *userUsecase) GetPublicProfile(ctx context.Context, username string) (*model.User, error) {
	user, err := u.userRepo.GetByUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}
	if user == nil {
		return nil, &NotFoundError{Resource: "user"}
	}
	return user, nil
}

// UploadAvatar はアバター画像をアップロードし、ユーザーの avatar_url を更新して公開 URL を返します。
// バリデーション:
//   - ファイルサイズ: 2MB 以下
//   - ファイル形式: JPEG または PNG のみ
//
// ストレージのパスは "{userID}/avatar{拡張子}" の形式で保存されます。
// 同じユーザーが再度アップロードすると、既存ファイルが上書きされます。
func (u *userUsecase) UploadAvatar(ctx context.Context, userID uuid.UUID, file io.Reader, fileSize int64, contentType string) (string, error) {
	// 1. プロフィールの存在確認
	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("failed to get profile: %w", err)
	}
	if user == nil {
		return "", &NotFoundError{Resource: "profile"}
	}

	// 2. ファイルサイズのバリデーション
	if fileSize > avatarMaxSize {
		return "", &ValidationError{Message: "file must be JPEG or PNG, max 2MB"}
	}

	// 3. Content-Type のバリデーション（JPEG / PNG のみ許可）
	ext, ok := allowedContentTypes[contentType]
	if !ok {
		return "", &ValidationError{Message: "file must be JPEG or PNG, max 2MB"}
	}

	// 4. ストレージにアップロード
	// パス例: "550e8400-e29b-41d4-a716-446655440000/avatar.jpg"
	path := fmt.Sprintf("%s/avatar%s", userID.String(), ext)
	avatarURL, err := u.fileStorage.Upload(ctx, avatarBucket, path, file, contentType)
	if err != nil {
		return "", fmt.Errorf("failed to upload avatar: %w", err)
	}

	// 5. ユーザーの avatar_url を更新
	user.AvatarURL = &avatarURL
	if err := u.userRepo.Update(ctx, user); err != nil {
		return "", fmt.Errorf("failed to update avatar_url: %w", err)
	}

	return avatarURL, nil
}
