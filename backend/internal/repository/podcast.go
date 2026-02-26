package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/kobayashikosei/podlog/backend/internal/model"
)

// PodcastRepository はポッドキャストデータへのアクセスを提供します。
type PodcastRepository interface {
	Create(ctx context.Context, podcast *model.Podcast) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Podcast, error)
	GetByItunesID(ctx context.Context, itunesID int64) (*model.Podcast, error)
	Search(ctx context.Context, query string, limit int) ([]model.Podcast, error)
}

type podcastRepository struct {
	db *sqlx.DB
}

// NewPodcastRepository は PodcastRepository の新しいインスタンスを生成します。
func NewPodcastRepository(db *sqlx.DB) PodcastRepository {
	return &podcastRepository{db: db}
}

// Create は新しいポッドキャストをDBに保存します。
// RETURNING * で挿入した行を返してもらい、generated な ID や created_at を取得します。
func (r *podcastRepository) Create(ctx context.Context, podcast *model.Podcast) error {
	query := `
		INSERT INTO podcasts (id, itunes_id, title, author, description, feed_url, artwork_url, itunes_url, genre, source_type, source_url)
		VALUES (:id, :itunes_id, :title, :author, :description, :feed_url, :artwork_url, :itunes_url, :genre, :source_type, :source_url)
	`
	_, err := r.db.NamedExecContext(ctx, query, podcast)
	if err != nil {
		return fmt.Errorf("failed to create podcast: %w", err)
	}
	return nil
}

// GetByID は UUID でポッドキャストを取得します。
func (r *podcastRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Podcast, error) {
	var podcast model.Podcast
	query := `SELECT * FROM podcasts WHERE id = $1`
	err := r.db.GetContext(ctx, &podcast, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get podcast: %w", err)
	}
	return &podcast, nil
}

// GetByItunesID は iTunes ID でポッドキャストを取得します。
// iTunes API から取得したデータが既にDBに存在するか確認するために使います。
func (r *podcastRepository) GetByItunesID(ctx context.Context, itunesID int64) (*model.Podcast, error) {
	var podcast model.Podcast
	query := `SELECT * FROM podcasts WHERE itunes_id = $1`
	err := r.db.GetContext(ctx, &podcast, query, itunesID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get podcast by itunes_id: %w", err)
	}
	return &podcast, nil
}

// Search はタイトルでポッドキャストを部分一致検索します。
// ILIKE は大文字小文字を区別しない LIKE 検索です（PostgreSQL固有）。
func (r *podcastRepository) Search(ctx context.Context, query string, limit int) ([]model.Podcast, error) {
	var podcasts []model.Podcast
	sqlQuery := `SELECT * FROM podcasts WHERE title ILIKE $1 ORDER BY title LIMIT $2`
	err := r.db.SelectContext(ctx, &podcasts, sqlQuery, "%"+query+"%", limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search podcasts: %w", err)
	}
	return podcasts, nil
}
