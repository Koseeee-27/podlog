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
	// Search はキーワードとジャンルで番組を検索します。
	// genres が空でなければ、いずれかのジャンルに一致する番組に絞り込みます（IN 句）。
	// これにより、親カテゴリに属する複数のサブカテゴリで同時に検索できます。
	Search(ctx context.Context, query string, genres []string, limit, offset int) ([]PodcastSearchRow, int, error)
	GetPopular(ctx context.Context, limit int) ([]PodcastSearchRow, error)

	// GetDistinctGenres は DB に登録されている番組のジャンル一覧を重複なしで取得します。
	// genre カラムが NULL や空文字の番組は除外します。
	GetDistinctGenres(ctx context.Context) ([]string, error)

	// ExistsByIDs は指定された podcast_id のリストが全てDB上に存在するか確認します。
	// 存在しない ID がある場合、存在しなかった ID のリストを返します。
	ExistsByIDs(ctx context.Context, ids []uuid.UUID) (missingIDs []uuid.UUID, err error)

	// UpdateGenre は指定したポッドキャストの genre カラムを更新します。
	// バッチ処理や iTunes API からのデータ取得時にジャンルを後から埋める用途で使います。
	UpdateGenre(ctx context.Context, id uuid.UUID, genre string) error

	// ListWithoutGenre は genre が NULL かつ itunes_id が NOT NULL のポッドキャストを返します。
	// バッチ処理で iTunes API から genre を一括取得する際に対象を特定するために使います。
	ListWithoutGenre(ctx context.Context) ([]model.Podcast, error)

	// ListWithoutEpisodes は feed_url が NOT NULL かつエピソードが0件のポッドキャストを返します。
	// バッチ処理でエピソードを一括取得する際に対象を特定するために使います。
	ListWithoutEpisodes(ctx context.Context) ([]model.Podcast, error)
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
// genres が空でなければ、いずれかのジャンルに一致する番組のみに絞り込みます（IN 句）。
//
// 総件数（total）とデータ取得を2つの別クエリで行います。
// COUNT(*) OVER() を使う1クエリ方式だと、offset が結果件数を超えた場合に
// 行が0件になり total が取得できないバグがあるため、2クエリ方式を採用しています。
func (r *podcastRepository) Search(ctx context.Context, query string, genres []string, limit, offset int) ([]PodcastSearchRow, int, error) {
	likePattern := "%" + query + "%"

	// ジャンル絞り込みの有無で WHERE 句を動的に組み立てます。
	// genres が空なら全ジャンルが対象、指定があれば IN 句で複数ジャンルに絞ります。
	//
	// sqlx.In を使って IN (?) のプレースホルダを展開します。
	// 例: genres = ["Comedy", "Improv", "Stand-Up"] の場合
	//   → WHERE p.genre IN ($2, $3, $4) に展開されます。
	genreFilter := ""
	args := []interface{}{likePattern}
	if len(genres) > 0 {
		// プレースホルダを手動で組み立てます
		// $2, $3, $4, ... のように連番のプレースホルダを生成します
		placeholders := ""
		for i, g := range genres {
			if i > 0 {
				placeholders += ", "
			}
			placeholders += fmt.Sprintf("$%d", i+2) // $1 は likePattern なので $2 から開始
			args = append(args, g)
		}
		genreFilter = fmt.Sprintf(" AND p.genre IN (%s)", placeholders)
	}

	// 1. 総件数を取得するクエリ
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM podcasts p WHERE p.title ILIKE $1%s`, genreFilter)
	var total int
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, fmt.Errorf("failed to count podcasts: %w", err)
	}

	// 2. データ取得クエリ
	// ジャンル指定がある場合はレビュー件数順でソートします。
	// ジャンル一覧から番組を探す場面では、レビューが多い＝人気のある番組を上位に
	// 表示する方がユーザーにとって有用です。
	// キーワード検索のみの場合はタイトル順のまま（検索ワードとの関連性を重視）。
	orderBy := "p.title, p.id"
	if len(genres) > 0 {
		orderBy = "total_reviews DESC, average_rating DESC, p.title, p.id"
	}

	// プレースホルダの番号をジャンル指定の有無で切り替えます。
	limitIdx := len(args) + 1
	offsetIdx := len(args) + 2
	dataQuery := fmt.Sprintf(`
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
		WHERE p.title ILIKE $1%s
		GROUP BY p.id, p.title, p.author, p.artwork_url
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, genreFilter, orderBy, limitIdx, offsetIdx)
	dataArgs := append(args, limit, offset)
	var rows []PodcastSearchRow
	if err := r.db.SelectContext(ctx, &rows, dataQuery, dataArgs...); err != nil {
		return nil, 0, fmt.Errorf("failed to search podcasts: %w", err)
	}

	return rows, total, nil
}

// UpdateGenre は指定したポッドキャストの genre カラムを更新します。
// updated_at も同時に更新して、最終更新日時を記録します。
func (r *podcastRepository) UpdateGenre(ctx context.Context, id uuid.UUID, genre string) error {
	query := `UPDATE podcasts SET genre = $1, updated_at = NOW() WHERE id = $2`
	result, err := r.db.ExecContext(ctx, query, genre, id)
	if err != nil {
		return fmt.Errorf("failed to update podcast genre: %w", err)
	}

	// RowsAffected で更新対象が存在したかを確認
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("podcast not found: %s", id)
	}

	return nil
}

// ListWithoutGenre は genre が NULL かつ itunes_id が NOT NULL のポッドキャストを返します。
// itunes_id がある番組だけが対象なのは、iTunes API で genre を取得できるのは
// iTunes 経由で登録された番組のみだからです。
func (r *podcastRepository) ListWithoutGenre(ctx context.Context) ([]model.Podcast, error) {
	query := `SELECT * FROM podcasts WHERE genre IS NULL AND itunes_id IS NOT NULL ORDER BY created_at`
	var podcasts []model.Podcast
	if err := r.db.SelectContext(ctx, &podcasts, query); err != nil {
		return nil, fmt.Errorf("failed to list podcasts without genre: %w", err)
	}
	return podcasts, nil
}

// ListWithoutEpisodes は feed_url が NOT NULL かつエピソードが0件のポッドキャストを返します。
// サブクエリで episodes テーブルに存在する podcast_id を除外することで、
// まだエピソードが1件も登録されていない番組だけを取得します。
func (r *podcastRepository) ListWithoutEpisodes(ctx context.Context) ([]model.Podcast, error) {
	query := `
		SELECT * FROM podcasts
		WHERE feed_url IS NOT NULL
		AND id NOT IN (SELECT DISTINCT podcast_id FROM episodes)
		ORDER BY created_at
	`
	var podcasts []model.Podcast
	if err := r.db.SelectContext(ctx, &podcasts, query); err != nil {
		return nil, fmt.Errorf("failed to list podcasts without episodes: %w", err)
	}
	return podcasts, nil
}

// GetDistinctGenres は DB に登録されている番組のジャンル一覧を重複なしで取得します。
// genre カラムが NULL や空文字の番組は除外し、アルファベット順で返します。
func (r *podcastRepository) GetDistinctGenres(ctx context.Context) ([]string, error) {
	query := `
		SELECT DISTINCT genre
		FROM podcasts
		WHERE genre IS NOT NULL AND genre != ''
		ORDER BY genre
	`
	var genres []string
	if err := r.db.SelectContext(ctx, &genres, query); err != nil {
		return nil, fmt.Errorf("failed to get distinct genres: %w", err)
	}
	return genres, nil
}

// GetPopular はレビュー件数の多い番組を取得します。
// 人気の番組セクション（探す画面）で使用します。
func (r *podcastRepository) GetPopular(ctx context.Context, limit int) ([]PodcastSearchRow, error) {
	query := `
		SELECT
			p.id,
			p.title,
			p.author,
			p.artwork_url,
			AVG(r.rating)::float8 AS average_rating,
			COUNT(r.id)::int AS total_reviews
		FROM podcasts p
		INNER JOIN episodes e ON p.id = e.podcast_id
		INNER JOIN reviews r ON e.id = r.episode_id
		INNER JOIN users u ON r.user_id = u.id AND u.deleted_at IS NULL
		GROUP BY p.id, p.title, p.author, p.artwork_url
		ORDER BY total_reviews DESC, average_rating DESC, p.id
		LIMIT $1
	`
	var rows []PodcastSearchRow
	if err := r.db.SelectContext(ctx, &rows, query, limit); err != nil {
		return nil, fmt.Errorf("failed to get popular podcasts: %w", err)
	}

	return rows, nil
}
