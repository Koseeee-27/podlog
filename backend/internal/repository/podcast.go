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

// PodcastSearchRow は番組検索結果の1行を表す構造体です。
// 番組情報に加えて、レビューから集計した平均評価・レビュー件数を含みます。
type PodcastSearchRow struct {
	ID            uuid.UUID `db:"id"`
	Title         string    `db:"title"`
	Author        *string   `db:"author"`
	ArtworkURL    *string   `db:"artwork_url"`
	AverageRating float64   `db:"average_rating"`
	TotalReviews  int       `db:"total_reviews"`
}

// PodcastRepository はポッドキャストデータへのアクセスを提供します。
type PodcastRepository interface {
	Create(ctx context.Context, podcast *model.Podcast) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Podcast, error)
	GetByItunesID(ctx context.Context, itunesID int64) (*model.Podcast, error)
	Search(ctx context.Context, query string, limit, offset int) ([]PodcastSearchRow, int, error)
	GetPopular(ctx context.Context, limit int) ([]PodcastSearchRow, error)

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

// Search はアプリ内 DB の番組をキーワードで部分一致検索します。
// ILIKE は大文字小文字を区別しない LIKE 検索です（PostgreSQL固有）。
// レビューテーブルとの LEFT JOIN で平均評価とレビュー件数も一緒に取得します。
// total（マッチした件数）も返し、ページネーションに対応します。
//
// 総件数（total）とデータ取得を2つの別クエリで行います。
// COUNT(*) OVER() を使う1クエリ方式だと、offset が結果件数を超えた場合に
// 行が0件になり total が取得できないバグがあるため、2クエリ方式を採用しています。
func (r *podcastRepository) Search(ctx context.Context, query string, limit, offset int) ([]PodcastSearchRow, int, error) {
	likePattern := "%" + query + "%"

	// 1. 総件数を取得するクエリ
	// offset に関係なく、ILIKE にマッチする番組の総数を返します。
	countQuery := `SELECT COUNT(*) FROM podcasts WHERE title ILIKE $1`
	var total int
	if err := r.db.GetContext(ctx, &total, countQuery, likePattern); err != nil {
		return nil, 0, fmt.Errorf("failed to count podcasts: %w", err)
	}

	// 2. データ取得クエリ
	// LEFT JOIN で episodes → reviews を辿り、番組単位の集計を行います。
	// LEFT JOIN を使うのは、レビューが1件もない番組も検索結果に含めるためです。
	dataQuery := `
		SELECT
			p.id,
			p.title,
			p.author,
			p.artwork_url,
			COALESCE(AVG(r.rating) FILTER (WHERE u.id IS NOT NULL)::float8, 0) AS average_rating,
			COUNT(r.id) FILTER (WHERE u.id IS NOT NULL)::int AS total_reviews
		FROM podcasts p
		LEFT JOIN episodes e ON p.id = e.podcast_id
		LEFT JOIN reviews r ON e.id = r.episode_id
		LEFT JOIN users u ON r.user_id = u.id AND u.deleted_at IS NULL
		WHERE p.title ILIKE $1
		GROUP BY p.id, p.title, p.author, p.artwork_url
		ORDER BY p.title, p.id
		LIMIT $2 OFFSET $3
	`
	var rows []PodcastSearchRow
	if err := r.db.SelectContext(ctx, &rows, dataQuery, likePattern, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to search podcasts: %w", err)
	}

	return rows, total, nil
}

// GetPopular はレビュー件数の多い番組を取得します。
// 人気の番組セクション（探す画面）で使用します。
func (r *podcastRepository) GetPopular(ctx context.Context, limit int) ([]PodcastSearchRow, error) {
	if limit <= 0 {
		limit = 10
	} else if limit > 50 {
		limit = 50
	}

	query := `
		SELECT
			p.id,
			p.title,
			p.author,
			p.artwork_url,
			COALESCE(AVG(r.rating) FILTER (WHERE u.id IS NOT NULL)::float8, 0) AS average_rating,
			COUNT(r.id) FILTER (WHERE u.id IS NOT NULL)::int AS total_reviews
		FROM podcasts p
		LEFT JOIN episodes e ON p.id = e.podcast_id
		LEFT JOIN reviews r ON e.id = r.episode_id
		LEFT JOIN users u ON r.user_id = u.id AND u.deleted_at IS NULL
		GROUP BY p.id, p.title, p.author, p.artwork_url
		HAVING COUNT(r.id) FILTER (WHERE u.id IS NOT NULL) > 0
		ORDER BY total_reviews DESC, average_rating DESC
		LIMIT $1
	`
	var rows []PodcastSearchRow
	if err := r.db.SelectContext(ctx, &rows, query, limit); err != nil {
		return nil, fmt.Errorf("failed to get popular podcasts: %w", err)
	}

	return rows, nil
}
