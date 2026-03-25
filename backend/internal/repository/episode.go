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

// EpisodeWithStatsRow はエピソード一覧でレビュー統計を含む行です。
type EpisodeWithStatsRow struct {
	ID            uuid.UUID  `db:"id"`
	Title         string     `db:"title"`
	Description   *string    `db:"description"`
	DurationMs    *int64     `db:"duration_ms"`
	PublishedAt   *time.Time `db:"published_at"`
	AverageRating float64    `db:"average_rating"`
	TotalReviews  int        `db:"total_reviews"`
}

// RecentEpisodeRow はユーザーがまだ聴いていないエピソード（番組情報付き）の行です。
// 記録ページの「最近のエピソード」表示用で、JOIN クエリの結果を受け取ります。
type RecentEpisodeRow struct {
	ID              uuid.UUID  `db:"id"`
	Title           string     `db:"title"`
	Description     *string    `db:"description"`
	DurationMs      *int64     `db:"duration_ms"`
	PublishedAt     *time.Time `db:"published_at"`
	PodcastID       uuid.UUID  `db:"podcast_id"`
	PodcastTitle    string     `db:"podcast_title"`
	PodcastArtwork  *string    `db:"podcast_artwork_url"`
}

// EpisodeRepository はエピソードデータへのアクセスを提供します。
type EpisodeRepository interface {
	Create(ctx context.Context, episode *model.Episode) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Episode, error)
	GetByPodcastID(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error)
	GetByPodcastIDWithStats(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]EpisodeWithStatsRow, int, error)
	GetByItunesTrackID(ctx context.Context, trackID int64) (*model.Episode, error)
	GetByGUID(ctx context.Context, podcastID uuid.UUID, guid string) (*model.Episode, error)
	GetRecentByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]RecentEpisodeRow, int, error)
}

type episodeRepository struct {
	db *sqlx.DB
}

// NewEpisodeRepository は EpisodeRepository の新しいインスタンスを生成します。
func NewEpisodeRepository(db *sqlx.DB) EpisodeRepository {
	return &episodeRepository{db: db}
}

// Create は新しいエピソードをDBに保存します。
func (r *episodeRepository) Create(ctx context.Context, episode *model.Episode) error {
	query := `
		INSERT INTO episodes (id, podcast_id, itunes_track_id, guid, title, description, audio_url, artwork_url, source_url, duration_ms, published_at)
		VALUES (:id, :podcast_id, :itunes_track_id, :guid, :title, :description, :audio_url, :artwork_url, :source_url, :duration_ms, :published_at)
	`
	_, err := r.db.NamedExecContext(ctx, query, episode)
	if err != nil {
		return fmt.Errorf("failed to create episode: %w", err)
	}
	return nil
}

// GetByID は UUID でエピソードを取得します。
func (r *episodeRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Episode, error) {
	var episode model.Episode
	query := `SELECT * FROM episodes WHERE id = $1`
	err := r.db.GetContext(ctx, &episode, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get episode: %w", err)
	}
	return &episode, nil
}

// GetByPodcastID はポッドキャストIDに紐づくエピソードを公開日の新しい順で取得します。
// limit と offset でページネーションを実現します。
func (r *episodeRepository) GetByPodcastID(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error) {
	var episodes []model.Episode
	query := `
		SELECT * FROM episodes
		WHERE podcast_id = $1
		ORDER BY published_at DESC NULLS LAST
		LIMIT $2 OFFSET $3
	`
	err := r.db.SelectContext(ctx, &episodes, query, podcastID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get episodes: %w", err)
	}
	return episodes, nil
}

// GetByItunesTrackID は iTunes Track ID でエピソードを取得します。
func (r *episodeRepository) GetByItunesTrackID(ctx context.Context, trackID int64) (*model.Episode, error) {
	var episode model.Episode
	query := `SELECT * FROM episodes WHERE itunes_track_id = $1`
	err := r.db.GetContext(ctx, &episode, query, trackID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get episode by itunes_track_id: %w", err)
	}
	return &episode, nil
}

// GetByGUID はポッドキャストIDとGUIDの組み合わせでエピソードを取得します。
// RSS フィードの重複検知に使用します。
func (r *episodeRepository) GetByGUID(ctx context.Context, podcastID uuid.UUID, guid string) (*model.Episode, error) {
	var episode model.Episode
	query := `SELECT * FROM episodes WHERE podcast_id = $1 AND guid = $2`
	err := r.db.GetContext(ctx, &episode, query, podcastID, guid)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get episode by guid: %w", err)
	}
	return &episode, nil
}

// GetByPodcastIDWithStats はポッドキャストのエピソード一覧をレビュー統計付きで取得します。
// 各エピソードに平均評価とレビュー件数を含み、総件数（total）も返します。
// LEFT JOIN でレビューテーブルを結合し、N+1 問題を回避しています。
// 削除済みユーザーのレビューは集計から除外します。
func (r *episodeRepository) GetByPodcastIDWithStats(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]EpisodeWithStatsRow, int, error) {
	// 1. 総件数を取得
	var total int
	countQuery := `SELECT COUNT(*) FROM episodes WHERE podcast_id = $1`
	if err := r.db.GetContext(ctx, &total, countQuery, podcastID); err != nil {
		return nil, 0, fmt.Errorf("failed to count episodes: %w", err)
	}

	// 2. データ取得（レビュー統計付き）
	dataQuery := `
		SELECT
			e.id,
			e.title,
			e.description,
			e.duration_ms,
			e.published_at,
			COALESCE(AVG(r.rating) FILTER (WHERE u.id IS NOT NULL)::float8, 0) AS average_rating,
			COUNT(r.id) FILTER (WHERE u.id IS NOT NULL)::int AS total_reviews
		FROM episodes e
		LEFT JOIN reviews r ON e.id = r.episode_id
		LEFT JOIN users u ON r.user_id = u.id AND u.deleted_at IS NULL
		WHERE e.podcast_id = $1
		GROUP BY e.id, e.title, e.description, e.duration_ms, e.published_at
		ORDER BY e.published_at DESC NULLS LAST, e.id DESC
		LIMIT $2 OFFSET $3
	`
	var rows []EpisodeWithStatsRow
	if err := r.db.SelectContext(ctx, &rows, dataQuery, podcastID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to get episodes with stats: %w", err)
	}

	return rows, total, nil
}

// GetRecentByUserID はユーザーが記録をつけた番組のうち、まだ聴いていないエピソードを取得します。
//
// 処理ロジック:
//  1. listening_records から、ユーザーが記録をつけた podcast_id をユニークに取得（サブクエリ）
//  2. それらの番組のエピソードのうち、ユーザーがまだ聴取記録をつけていないものを抽出
//  3. 公開日の新しい順でソートし、limit/offset でページネーション
//
// NOT EXISTS を使って「まだ聴いていない」エピソードを効率的にフィルタリングしています。
// IN + サブクエリで「記録をつけた番組」を特定し、NOT EXISTS で「未聴取」を判定します。
func (r *episodeRepository) GetRecentByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]RecentEpisodeRow, int, error) {
	// 「ユーザーが記録をつけた番組の、まだ聴いていないエピソード」の条件を共通化
	// WHERE 句をカウントクエリとデータクエリの両方で使うため、変数にまとめています
	whereClause := `
		WHERE e.podcast_id IN (
			SELECT DISTINCT ep.podcast_id
			FROM listening_records lr2
			JOIN episodes ep ON lr2.episode_id = ep.id
			WHERE lr2.user_id = $1
		)
		AND NOT EXISTS (
			SELECT 1 FROM listening_records lr3
			WHERE lr3.user_id = $1 AND lr3.episode_id = e.id
		)
	`

	// 1. 総件数を取得
	var total int
	countQuery := `SELECT COUNT(*) FROM episodes e` + whereClause
	if err := r.db.GetContext(ctx, &total, countQuery, userID); err != nil {
		return nil, 0, fmt.Errorf("failed to count recent episodes: %w", err)
	}

	// 2. データ取得（番組情報を JOIN して取得）
	dataQuery := `
		SELECT
			e.id,
			e.title,
			e.description,
			e.duration_ms,
			e.published_at,
			e.podcast_id,
			p.title AS podcast_title,
			p.artwork_url AS podcast_artwork_url
		FROM episodes e
		JOIN podcasts p ON e.podcast_id = p.id
	` + whereClause + `
		ORDER BY e.published_at DESC NULLS LAST, e.id DESC
		LIMIT $2 OFFSET $3
	`
	var rows []RecentEpisodeRow
	if err := r.db.SelectContext(ctx, &rows, dataQuery, userID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to get recent episodes: %w", err)
	}

	return rows, total, nil
}
