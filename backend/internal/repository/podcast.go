package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/Koseeee-27/podlog/backend/internal/model"
)

// escapeILIKE は ILIKE パターン内の特殊文字（\, %, _）をエスケープします。
// PostgreSQL の ILIKE では % が任意の文字列、_ が任意の1文字にマッチするため、
// ユーザー入力をそのまま渡すと意図しないパターンマッチが発生します。
func escapeILIKE(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}

// PodcastSearchRow は番組検索結果の1行を表す構造体です。
// 番組情報に加えて、レビューから集計した平均評価・レビュー件数を含みます。
type PodcastSearchRow struct {
	ID            uuid.UUID `db:"id"`
	Title         string    `db:"title"`
	Author        *string   `db:"author"`
	ArtworkURL    *string   `db:"artwork_url"`
	AverageRating float64   `db:"average_rating"`
	TotalReviews  int       `db:"total_reviews"`
	FavoriteCount int       `db:"favorite_count"`
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
//
// query が空文字の場合（ジャンルブラウズ時）は ILIKE 条件を外し、
// genre のみで絞り込みます。これにより ILIKE '%%' による全件スキャンを防ぎます。
func (r *podcastRepository) Search(ctx context.Context, query string, genres []string, limit, offset int) ([]PodcastSearchRow, int, error) {
	// WHERE 句の条件とプレースホルダ引数を動的に組み立てます。
	// conditions には "p.title ILIKE $1" や "p.genre IN ($2, $3)" のような
	// SQL 条件式のパーツを追加していきます。
	// args にはそれぞれの $N に対応する値を順番に追加します。
	var conditions []string
	var args []interface{}

	// query が空でなければ ILIKE 条件を追加（キーワード検索）
	if query != "" {
		likePattern := "%" + escapeILIKE(query) + "%"
		args = append(args, likePattern)
		conditions = append(conditions, fmt.Sprintf("p.title ILIKE $%d ESCAPE '\\'", len(args)))
	}

	// genres が空でなければ IN 句を追加（ジャンル絞り込み）
	if len(genres) > 0 {
		placeholders := ""
		for i, g := range genres {
			if i > 0 {
				placeholders += ", "
			}
			args = append(args, g)
			placeholders += fmt.Sprintf("$%d", len(args))
		}
		conditions = append(conditions, fmt.Sprintf("p.genre IN (%s)", placeholders))
	}

	// 条件が1つもない場合は WHERE 句なし（全件取得）、
	// 条件がある場合は AND で連結して WHERE 句を組み立てます。
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + conditions[0]
		for _, c := range conditions[1:] {
			whereClause += " AND " + c
		}
	}

	// 1. 総件数を取得するクエリ
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM podcasts p %s`, whereClause)
	var total int
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, fmt.Errorf("failed to count podcasts: %w", err)
	}

	// 2. データ取得クエリ
	// ジャンル指定がある場合はお気に入り数 → レビュー件数 → 平均評価の順でソートします。
	// お気に入りはワンタップで登録でき、レビューよりデータが溜まりやすいため優先します。
	// キーワード検索のみの場合はタイトル順のまま（検索ワードとの関連性を重視）。
	orderBy := "p.title, p.id"
	if len(genres) > 0 {
		orderBy = "favorite_count DESC, total_reviews DESC, average_rating DESC, p.title, p.id"
	}

	// LIMIT / OFFSET のプレースホルダ番号は、これまでの args の数 +1, +2 になります。
	limitIdx := len(args) + 1
	offsetIdx := len(args) + 2
	dataQuery := fmt.Sprintf(`
		SELECT
			p.id,
			p.title,
			p.author,
			p.artwork_url,
			COALESCE(AVG(r.rating) FILTER (WHERE u.id IS NOT NULL)::float8, 0) AS average_rating,
			COUNT(r.id) FILTER (WHERE u.id IS NOT NULL)::int AS total_reviews,
			COALESCE(fav.cnt, 0)::int AS favorite_count
		FROM podcasts p
		LEFT JOIN episodes e ON p.id = e.podcast_id
		LEFT JOIN reviews r ON e.id = r.episode_id
		LEFT JOIN users u ON r.user_id = u.id AND u.deleted_at IS NULL
		LEFT JOIN (
			SELECT fp.podcast_id, COUNT(fp.user_id)::int AS cnt
			FROM favorite_podcasts fp
			INNER JOIN users fu ON fp.user_id = fu.id AND fu.deleted_at IS NULL
			GROUP BY fp.podcast_id
		) fav ON p.id = fav.podcast_id
		%s
		GROUP BY p.id, p.title, p.author, p.artwork_url, fav.cnt
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, limitIdx, offsetIdx)
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
		WHERE feed_url IS NOT NULL AND feed_url != ''
		AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id = podcasts.id)
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
			COUNT(r.id)::int AS total_reviews,
			COALESCE(fav.cnt, 0)::int AS favorite_count
		FROM podcasts p
		INNER JOIN episodes e ON p.id = e.podcast_id
		INNER JOIN reviews r ON e.id = r.episode_id
		INNER JOIN users u ON r.user_id = u.id AND u.deleted_at IS NULL
		LEFT JOIN (
			SELECT fp.podcast_id, COUNT(fp.user_id)::int AS cnt
			FROM favorite_podcasts fp
			INNER JOIN users fu ON fp.user_id = fu.id AND fu.deleted_at IS NULL
			GROUP BY fp.podcast_id
		) fav ON p.id = fav.podcast_id
		GROUP BY p.id, p.title, p.author, p.artwork_url, fav.cnt
		ORDER BY total_reviews DESC, average_rating DESC, p.id
		LIMIT $1
	`
	var rows []PodcastSearchRow
	if err := r.db.SelectContext(ctx, &rows, query, limit); err != nil {
		return nil, fmt.Errorf("failed to get popular podcasts: %w", err)
	}

	return rows, nil
}
