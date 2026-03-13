package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// FavoritePodcastRepository は好きな番組データへのアクセスを提供します。
type FavoritePodcastRepository interface {
	// GetByUsername はユーザー名を指定して好きな番組一覧を取得します。
	// favorite_podcasts を users・podcasts と JOIN し、position 順で返します。
	GetByUsername(ctx context.Context, username string) ([]FavoritePodcastRow, error)
}

// FavoritePodcastRow は好きな番組一覧の JOIN 結果です。
// API レスポンスに必要なフィールド（id, title, artwork_url）のみ含みます。
type FavoritePodcastRow struct {
	PodcastID  uuid.UUID `db:"id"`
	Title      string    `db:"title"`
	ArtworkURL *string   `db:"artwork_url"`
}

type favoritePodcastRepository struct {
	db *sqlx.DB
}

// NewFavoritePodcastRepository は FavoritePodcastRepository の新しいインスタンスを生成します。
func NewFavoritePodcastRepository(db *sqlx.DB) FavoritePodcastRepository {
	return &favoritePodcastRepository{db: db}
}

// GetByUsername はユーザー名を指定して好きな番組一覧を取得します。
// SQL の処理:
//  1. favorite_podcasts と users を user_id で JOIN（ユーザー名で絞り込むため）
//  2. favorite_podcasts と podcasts を podcast_id で JOIN（番組情報を取得するため）
//  3. users.deleted_at IS NULL で論理削除済みユーザーを除外
//  4. position ASC で表示順を保持
func (r *favoritePodcastRepository) GetByUsername(ctx context.Context, username string) ([]FavoritePodcastRow, error) {
	query := `
		SELECT
			p.id,
			p.title,
			p.artwork_url
		FROM favorite_podcasts fp
		JOIN users u ON fp.user_id = u.id
		JOIN podcasts p ON fp.podcast_id = p.id
		WHERE u.username = $1 AND u.deleted_at IS NULL
		ORDER BY fp.position ASC
	`
	var rows []FavoritePodcastRow
	if err := r.db.SelectContext(ctx, &rows, query, username); err != nil {
		return nil, fmt.Errorf("failed to get favorite podcasts by username: %w", err)
	}

	return rows, nil
}
