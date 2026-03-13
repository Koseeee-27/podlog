// Package repository はデータアクセス層です。
// SQL クエリを実行してデータベースとやり取りします。
// ビジネスロジックはここに書かず、usecase 層に委譲します。
package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/Koseeee-27/podlog/backend/internal/model"
)

// UserRepository はユーザーデータへのアクセスを提供します。
// インターフェースを定義することで、テスト時にモック（偽物）に差し替え可能にします。
type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	GetByUsername(ctx context.Context, username string) (*model.User, error)
	Update(ctx context.Context, user *model.User) error
	UpdateAvatarURL(ctx context.Context, userID uuid.UUID, avatarURL string) error
	ExistsByUsername(ctx context.Context, username string) (bool, error)
}

// userRepository は UserRepository の実装です。
// sqlx.DB（データベース接続）を内部に持ちます。
type userRepository struct {
	db *sqlx.DB
}

// NewUserRepository は UserRepository の新しいインスタンスを生成します。
// db は sqlx.DB のポインタで、main.go から注入されます。
func NewUserRepository(db *sqlx.DB) UserRepository {
	return &userRepository{db: db}
}

// Create は新しいユーザーをデータベースに挿入します。
// sqlx の NamedExecContext を使うと、構造体のフィールドを :field_name でバインドできます。
func (r *userRepository) Create(ctx context.Context, user *model.User) error {
	query := `
		INSERT INTO users (id, username, display_name, avatar_url, bio, created_at, updated_at)
		VALUES (:id, :username, :display_name, :avatar_url, :bio, NOW(), NOW())
	`
	_, err := r.db.NamedExecContext(ctx, query, user)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

// GetByID は UUID でユーザーを検索します。
// sqlx.GetContext は結果を1行だけ取得して構造体にマッピングします。
// 見つからない場合は sql.ErrNoRows が返ります。
func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	var user model.User
	query := `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`
	err := r.db.GetContext(ctx, &user, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // 見つからない場合は nil を返す（エラーではない）
		}
		return nil, fmt.Errorf("failed to get user by id: %w", err)
	}
	return &user, nil
}

// GetByUsername はユーザー名でユーザーを検索します。
func (r *userRepository) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	var user model.User
	query := `SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL`
	err := r.db.GetContext(ctx, &user, query, username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}
	return &user, nil
}

// Update はユーザー情報を更新します。
// updated_at を NOW() で自動更新します。
func (r *userRepository) Update(ctx context.Context, user *model.User) error {
	query := `
		UPDATE users
		SET display_name = :display_name,
		    avatar_url = :avatar_url,
		    bio = :bio,
		    updated_at = NOW()
		WHERE id = :id AND deleted_at IS NULL
	`
	_, err := r.db.NamedExecContext(ctx, query, user)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}

// UpdateAvatarURL はユーザーの avatar_url のみを更新します。
// avatar_url 以外のフィールド（display_name, bio）には影響しないため、
// 同時リクエストによる競合を防ぎます。
// 対象ユーザーが見つからない（削除済み含む）場合は sql.ErrNoRows をラップしたエラーを返します。
func (r *userRepository) UpdateAvatarURL(ctx context.Context, userID uuid.UUID, avatarURL string) error {
	query := `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL`
	result, err := r.db.ExecContext(ctx, query, avatarURL, userID)
	if err != nil {
		return fmt.Errorf("failed to update avatar_url: %w", err)
	}

	// RowsAffected で更新対象が存在したか確認する。
	// usecase 層で事前チェックしているため通常は 0 にならないが、
	// DB 層の防御として対象なしをエラーにする。
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("user not found (id=%s): %w", userID, sql.ErrNoRows)
	}

	return nil
}

// ExistsByUsername は指定のユーザー名が既に使われているか確認します。
// ユニーク制約違反を事前にチェックするために使います。
func (r *userRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE username = $1 AND deleted_at IS NULL)`
	err := r.db.GetContext(ctx, &exists, query, username)
	if err != nil {
		return false, fmt.Errorf("failed to check username existence: %w", err)
	}
	return exists, nil
}
