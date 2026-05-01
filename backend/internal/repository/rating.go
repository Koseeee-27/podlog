package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/Koseeee-27/podlog/backend/internal/model"
)

// RatingRepository は評価データへのアクセスを提供します。
//
// 旧 ReviewRepository から rating 関連のメソッドのみを移植し、コメント連動の処理を完全に
// 取り除いたものです。SQL 内のテーブル名・カラム名はすべて ratings テーブルに合わせています。
type RatingRepository interface {
	Create(ctx context.Context, rating *model.Rating) error
	Update(ctx context.Context, rating *model.Rating) error
	Delete(ctx context.Context, userID, episodeID uuid.UUID) error
	GetByUserAndEpisode(ctx context.Context, userID, episodeID uuid.UUID) (*model.Rating, error)

	// GetEpisodeStats はエピソードに紐づく評価の集計値を返します。
	// 戻り値: 平均評価 / 総件数 / 1〜5 の星別ヒストグラム。
	// 削除済みユーザー（users.deleted_at IS NOT NULL）の評価は除外します。
	GetEpisodeStats(ctx context.Context, episodeID uuid.UUID) (avg float64, total int, distribution map[int]int, err error)

	// GetUsernameStats はユーザー名で指定したユーザーの評価集計値を返します。
	// 戻り値: 平均評価 / 総件数 / 1〜5 の星別ヒストグラム。
	// 削除済みユーザーは呼び出し元で除外する想定（ExistsByUsername で事前チェック）。
	GetUsernameStats(ctx context.Context, username string) (avg float64, total int, distribution map[int]int, err error)

	// GetAverageRatingByPodcastID は番組に紐づく全エピソードの評価から平均評価と総件数を集計します。
	// 削除済みユーザーの評価は除外します。
	GetAverageRatingByPodcastID(ctx context.Context, podcastID uuid.UUID) (float64, int, error)

	// GetByUserID は指定ユーザーの評価一覧をエピソード・番組情報付きで返します。
	// 自分の評価一覧 (`GET /users/me/ratings`) で使用します。
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]RatingWithDetailsRow, int, error)
}

// RatingWithDetailsRow は評価一覧でエピソード・番組情報を含む JOIN 結果です。
// 旧 ReviewWithDetailsRow から `comment` 列を削除しただけの構造です。
type RatingWithDetailsRow struct {
	ID                uuid.UUID `db:"id"`
	Rating            int       `db:"rating"`
	CreatedAt         time.Time `db:"created_at"`
	UpdatedAt         time.Time `db:"updated_at"`
	EpisodeID         uuid.UUID `db:"episode_id"`
	EpisodeTitle      string    `db:"episode_title"`
	PodcastID         uuid.UUID `db:"podcast_id"`
	EpisodeArtworkURL *string   `db:"episode_artwork_url"`
	PodcastTitle      string    `db:"podcast_title"`
	PodcastArtworkURL *string   `db:"podcast_artwork_url"`
}

type ratingRepository struct {
	db *sqlx.DB
}

// NewRatingRepository は RatingRepository の新しいインスタンスを生成します。
func NewRatingRepository(db *sqlx.DB) RatingRepository {
	return &ratingRepository{db: db}
}

// Create は新しい評価を DB に保存します。
//
// ratings テーブルには user_id × episode_id の UNIQUE 制約があり、同一ユーザーが
// 同じエピソードに 2 件目を投稿しようとすると pq の 23505（unique_violation）が返ります。
// 呼び出し元（usecase）は `helpers.go` の isUniqueViolation を使って ConflictError に
// 変換します。
func (r *ratingRepository) Create(ctx context.Context, rating *model.Rating) error {
	query := `
		INSERT INTO ratings (id, user_id, episode_id, rating)
		VALUES (:id, :user_id, :episode_id, :rating)
	`
	_, err := r.db.NamedExecContext(ctx, query, rating)
	if err != nil {
		return fmt.Errorf("failed to create rating: %w", err)
	}
	return nil
}

// Update は評価値を更新します。
//
// `RowsAffected == 0` の場合は `sql.ErrNoRows` を返します。
// usecase 側で事前に `GetByUserAndEpisode` で存在確認していますが、その間に並行 DELETE で
// 消されるレースで「更新が空振りしたのに 200 を返してしまう」TOCTOU を防ぐためです。
// `Delete` 側（同ファイル）と挙動を揃えています。
func (r *ratingRepository) Update(ctx context.Context, rating *model.Rating) error {
	query := `
		UPDATE ratings
		SET rating = $1, updated_at = NOW()
		WHERE id = $2
	`
	result, err := r.db.ExecContext(ctx, query, rating.Rating, rating.ID)
	if err != nil {
		return fmt.Errorf("failed to update rating: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// Delete はユーザーとエピソードの組み合わせで評価を削除します。
// 影響範囲は ratings のみで、同一ユーザーが投稿した感想（comments）には影響しません。
func (r *ratingRepository) Delete(ctx context.Context, userID, episodeID uuid.UUID) error {
	query := `DELETE FROM ratings WHERE user_id = $1 AND episode_id = $2`
	result, err := r.db.ExecContext(ctx, query, userID, episodeID)
	if err != nil {
		return fmt.Errorf("failed to delete rating: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// GetByUserAndEpisode はユーザーとエピソードの組み合わせで評価を取得します。
// 該当行が無い場合は (nil, nil) を返します（404 判定は呼び出し元の責務）。
func (r *ratingRepository) GetByUserAndEpisode(ctx context.Context, userID, episodeID uuid.UUID) (*model.Rating, error) {
	var rating model.Rating
	query := `SELECT * FROM ratings WHERE user_id = $1 AND episode_id = $2`
	err := r.db.GetContext(ctx, &rating, query, userID, episodeID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get rating: %w", err)
	}
	return &rating, nil
}

// distributionRow は星別ヒストグラムを 1 行ずつ受け取るための内部構造体です。
type distributionRow struct {
	Rating int `db:"rating"`
	Count  int `db:"count"`
}

// queryDistribution は GetEpisodeStats / GetUsernameStats から共通で使う集計クエリを実行します。
//
// 1 クエリで「平均・総件数・星別件数」を取得できないことはありませんが、星別件数は GROUP BY が必要な
// 別形のクエリになるため、可読性を優先して 2 クエリに分けています。N+1 にはなりません（呼び出し元の
// HTTP リクエスト 1 回につき 2 クエリ）。
//
// distribution は呼び出し側の便宜のため、必ず 1〜5 の全キーを 0 で初期化した map を返します。
// クエリ結果に含まれない星（例: 誰も 1 を付けていない）は 0 のまま残ります。
func (r *ratingRepository) queryDistribution(ctx context.Context, query string, args ...any) (map[int]int, error) {
	distribution := map[int]int{1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
	var rows []distributionRow
	if err := r.db.SelectContext(ctx, &rows, query, args...); err != nil {
		return nil, fmt.Errorf("failed to get rating distribution: %w", err)
	}
	for _, row := range rows {
		// CHECK 制約 (rating BETWEEN 1 AND 5) で範囲は保証されているが、防御的にガード
		if row.Rating >= 1 && row.Rating <= 5 {
			distribution[row.Rating] = row.Count
		}
	}
	return distribution, nil
}

// GetEpisodeStats はエピソードの評価集計値（平均・件数・分布）を返します。
//
// 削除済みユーザーの評価は除外するため users テーブルと JOIN し、deleted_at IS NULL で
// 絞り込みます。これは旧 ReviewRepository の集計クエリと同じ流儀です。
func (r *ratingRepository) GetEpisodeStats(ctx context.Context, episodeID uuid.UUID) (float64, int, map[int]int, error) {
	// 1. 平均と総件数（FILTER で削除済みユーザーを除外）
	var aggregated struct {
		Average *float64 `db:"average"`
		Count   int      `db:"count"`
	}
	avgQuery := `
		SELECT
			COALESCE(AVG(r.rating)::float8, 0) AS average,
			COUNT(*) AS count
		FROM ratings r
		JOIN users u ON r.user_id = u.id
		WHERE r.episode_id = $1 AND u.deleted_at IS NULL
	`
	if err := r.db.GetContext(ctx, &aggregated, avgQuery, episodeID); err != nil {
		return 0, 0, nil, fmt.Errorf("failed to get episode rating stats: %w", err)
	}

	// 2. 星別ヒストグラム
	distQuery := `
		SELECT r.rating, COUNT(*)::int AS count
		FROM ratings r
		JOIN users u ON r.user_id = u.id
		WHERE r.episode_id = $1 AND u.deleted_at IS NULL
		GROUP BY r.rating
	`
	distribution, err := r.queryDistribution(ctx, distQuery, episodeID)
	if err != nil {
		return 0, 0, nil, err
	}

	avg := 0.0
	if aggregated.Average != nil {
		avg = *aggregated.Average
	}
	return avg, aggregated.Count, distribution, nil
}

// GetUsernameStats はユーザー名で指定したユーザーの評価集計値（平均・件数・分布）を返します。
//
// 削除済みユーザー判定は呼び出し元（usecase 層の ExistsByUsername）が事前に行うため、
// このメソッド内では deleted_at の絞り込みは省略しています（ratings は ON DELETE CASCADE で
// users 削除時に物理削除されるため、削除済みユーザーの評価が残っているケースは無い）。
func (r *ratingRepository) GetUsernameStats(ctx context.Context, username string) (float64, int, map[int]int, error) {
	var aggregated struct {
		Average *float64 `db:"average"`
		Count   int      `db:"count"`
	}
	avgQuery := `
		SELECT
			COALESCE(AVG(r.rating)::float8, 0) AS average,
			COUNT(*) AS count
		FROM ratings r
		JOIN users u ON r.user_id = u.id
		WHERE u.username = $1 AND u.deleted_at IS NULL
	`
	if err := r.db.GetContext(ctx, &aggregated, avgQuery, username); err != nil {
		return 0, 0, nil, fmt.Errorf("failed to get username rating stats: %w", err)
	}

	distQuery := `
		SELECT r.rating, COUNT(*)::int AS count
		FROM ratings r
		JOIN users u ON r.user_id = u.id
		WHERE u.username = $1 AND u.deleted_at IS NULL
		GROUP BY r.rating
	`
	distribution, err := r.queryDistribution(ctx, distQuery, username)
	if err != nil {
		return 0, 0, nil, err
	}

	avg := 0.0
	if aggregated.Average != nil {
		avg = *aggregated.Average
	}
	return avg, aggregated.Count, distribution, nil
}

// GetAverageRatingByPodcastID はポッドキャストの全エピソードの平均評価と総件数を取得します。
// `GET /podcasts/{id}/rating` 用の軽量エンドポイント。distribution は使わないので返しません。
func (r *ratingRepository) GetAverageRatingByPodcastID(ctx context.Context, podcastID uuid.UUID) (float64, int, error) {
	var result struct {
		Average *float64 `db:"average"`
		Count   int      `db:"count"`
	}
	query := `
		SELECT COALESCE(AVG(r.rating)::float8, 0) AS average, COUNT(*) AS count
		FROM ratings r
		JOIN episodes e ON r.episode_id = e.id
		JOIN users u ON r.user_id = u.id
		WHERE e.podcast_id = $1 AND u.deleted_at IS NULL
	`
	if err := r.db.GetContext(ctx, &result, query, podcastID); err != nil {
		return 0, 0, fmt.Errorf("failed to get average rating for podcast: %w", err)
	}
	avg := 0.0
	if result.Average != nil {
		avg = *result.Average
	}
	return avg, result.Count, nil
}

// GetByUserID はユーザーの評価一覧をエピソード・番組情報付きで取得します。
// 自分の評価一覧（`GET /users/me/ratings`）で使用します。
func (r *ratingRepository) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]RatingWithDetailsRow, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM ratings WHERE user_id = $1`
	if err := r.db.GetContext(ctx, &total, countQuery, userID); err != nil {
		return nil, 0, fmt.Errorf("failed to count ratings: %w", err)
	}

	query := `
		SELECT
			r.id,
			r.rating,
			r.created_at,
			r.updated_at,
			e.id AS episode_id,
			e.title AS episode_title,
			e.podcast_id,
			e.artwork_url AS episode_artwork_url,
			p.title AS podcast_title,
			p.artwork_url AS podcast_artwork_url
		FROM ratings r
		JOIN episodes e ON r.episode_id = e.id
		JOIN podcasts p ON e.podcast_id = p.id
		WHERE r.user_id = $1
		ORDER BY r.created_at DESC
		LIMIT $2 OFFSET $3
	`
	var rows []RatingWithDetailsRow
	if err := r.db.SelectContext(ctx, &rows, query, userID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to get ratings: %w", err)
	}

	return rows, total, nil
}
