// Package usecase はビジネスロジック層です。
// handler からリクエストデータを受け取り、repository を使ってデータを操作します。
// バリデーションやビジネスルールの判定はここで行います。
package usecase

import (
	"context"
	"fmt"
	"regexp"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/model"
	"github.com/kobayashikosei/podlog/backend/internal/repository"
)

// usernameRegex はユーザー名のバリデーションに使う正規表現です。
// 英数字とアンダースコアのみ、3〜30文字を許可します。
var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)

// UserUsecase はユーザーに関するビジネスロジックのインターフェースです。
type UserUsecase interface {
	CreateProfile(ctx context.Context, userID uuid.UUID, req model.CreateProfileRequest) (*model.User, error)
	GetMyProfile(ctx context.Context, userID uuid.UUID) (*model.User, error)
	UpdateMyProfile(ctx context.Context, userID uuid.UUID, req model.UpdateProfileRequest) (*model.User, error)
	GetPublicProfile(ctx context.Context, username string) (*model.User, error)
}

// userUsecase は UserUsecase の実装です。
type userUsecase struct {
	userRepo repository.UserRepository
}

// NewUserUsecase は UserUsecase の新しいインスタンスを生成します。
func NewUserUsecase(userRepo repository.UserRepository) UserUsecase {
	return &userUsecase{userRepo: userRepo}
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
