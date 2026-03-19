// Package model はドメインの構造体（データの型）を定義します。
// DB のテーブルと対応する構造体をここに置きます。
package model

import (
	"time"

	"github.com/google/uuid"
)

// User はユーザーを表すドメインモデルです。
// `db` タグは sqlx が DB のカラム名と構造体フィールドを対応付けるために使います。
// `json` タグは JSON に変換するときのキー名を指定します。
type User struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	Username    string     `db:"username" json:"username"`
	DisplayName string     `db:"display_name" json:"display_name"`
	AvatarURL   *string    `db:"avatar_url" json:"avatar_url,omitempty"`
	Bio         *string    `db:"bio" json:"bio,omitempty"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt   *time.Time `db:"deleted_at" json:"-"`
}

// CreateProfileRequest はプロフィール作成リクエストの構造体です。
// ハンドラーでリクエストボディをバインドするのに使います。
type CreateProfileRequest struct {
	Username    string  `json:"username" validate:"required"`
	DisplayName string  `json:"display_name" validate:"required"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
	Bio         *string `json:"bio,omitempty"`
}

// UpdateProfileRequest はプロフィール更新リクエストの構造体です。
// ポインタ型にすることで、フィールドが送られなかった場合（nil）と
// 空文字列が送られた場合を区別できます。
type UpdateProfileRequest struct {
	DisplayName *string `json:"display_name,omitempty"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
	Bio         *string `json:"bio,omitempty"`
}

// UserPublicProfile は公開プロフィールのレスポンス構造体です。
// deleted_at など内部情報を含まない安全な形式です。
type UserPublicProfile struct {
	ID          uuid.UUID `json:"id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`
	Bio         *string   `json:"bio,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// AvatarUploadResponse はアバターアップロード API のレスポンス構造体です。
type AvatarUploadResponse struct {
	AvatarURL string `json:"avatar_url"`
}

// MyProfileResponse は GET /users/me のレスポンス構造体です。
// User の全フィールドに加えて、管理者かどうかを示す is_admin フィールドを持ちます。
// deleted_at は JSON に含めません（`json:"-"` タグで除外）。
type MyProfileResponse struct {
	ID          uuid.UUID  `json:"id"`
	Username    string     `json:"username"`
	DisplayName string     `json:"display_name"`
	AvatarURL   *string    `json:"avatar_url,omitempty"`
	Bio         *string    `json:"bio,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	IsAdmin     bool       `json:"is_admin"`
}

// ToMyProfileResponse は User から自分のプロフィールレスポンスに変換します。
// isAdmin には、このユーザーが管理者かどうかの判定結果を渡します。
func (u *User) ToMyProfileResponse(isAdmin bool) MyProfileResponse {
	return MyProfileResponse{
		ID:          u.ID,
		Username:    u.Username,
		DisplayName: u.DisplayName,
		AvatarURL:   u.AvatarURL,
		Bio:         u.Bio,
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
		IsAdmin:     isAdmin,
	}
}

// ToPublicProfile は User から公開用プロフィールに変換します。
func (u *User) ToPublicProfile() UserPublicProfile {
	return UserPublicProfile{
		ID:          u.ID,
		Username:    u.Username,
		DisplayName: u.DisplayName,
		AvatarURL:   u.AvatarURL,
		Bio:         u.Bio,
		CreatedAt:   u.CreatedAt,
	}
}
