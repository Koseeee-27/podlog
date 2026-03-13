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

	// ExistsByIDs は指定された podcast_id のリストが全てDB上に存在するか確認します。
	// 存在しない ID がある場合、存在しなかった ID のリストを返します。
	ExistsByIDs(ctx context.Context, ids []uuid.UUID) (missingIDs []uuid.UUID, err error)
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

// ExistsByIDs は指定された podcast_id が全てDBに存在するかチェックします。
// 存在しない ID を missingIDs として返します。
//
// sqlx.In はプレースホルダを展開してくれるヘルパーです。
// 例: IN (?) → IN ($1, $2, $3) のように展開されます。
func (r *podcastRepository) ExistsByIDs(ctx context.Context, ids []uuid.UUID) ([]uuid.UUID, error) {
	if len(ids) == 0 {
		return nil, nil
	}

	// sqlx.In でプレースホルダを展開
	query, args, err := sqlx.In(`SELECT id FROM podcasts WHERE id IN (?)`, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to build IN query: %w", err)
	}
	// PostgreSQL 用にプレースホルダを $1, $2, ... に変換
	query = r.db.Rebind(query)

	var foundIDs []uuid.UUID
	if err := r.db.SelectContext(ctx, &foundIDs, query, args...); err != nil {
		return nil, fmt.Errorf("failed to check podcast existence: %w", err)
	}

	// 見つかった ID をマップに入れて、入力リストと比較
	foundSet := make(map[uuid.UUID]bool, len(foundIDs))
	for _, id := range foundIDs {
		foundSet[id] = true
	}

	var missing []uuid.UUID
	for _, id := range ids {
		if !foundSet[id] {
			missing = append(missing, id)
		}
	}

	return missing, nil
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
