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
// Listened は認証ユーザーの聴取状態です。未認証（userID が nil）の場合は NULL になります。
type EpisodeWithStatsRow struct {
	ID            uuid.UUID  `db:"id"`
	Title         string     `db:"title"`
	Description   *string    `db:"description"`
	DurationMs    *int64     `db:"duration_ms"`
	PublishedAt   *time.Time `db:"published_at"`
	AverageRating float64    `db:"average_rating"`
	TotalReviews  int        `db:"total_reviews"`
	Listened      *bool      `db:"listened"`
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
	TotalUnlistened int        `db:"total_unlistened"`
}

// EpisodeRepository はエピソードデータへのアクセスを提供します。
type EpisodeRepository interface {
	Create(ctx context.Context, episode *model.Episode) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Episode, error)
	GetByPodcastID(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error)
	// GetByPodcastIDWithStats はエピソード一覧をレビュー統計付きで取得します。
	// userID が nil でない場合、各エピソードの聴取状態（listened）も含めます。
	GetByPodcastIDWithStats(ctx context.Context, podcastID uuid.UUID, limit, offset int, userID *uuid.UUID) ([]EpisodeWithStatsRow, int, error)
	GetByItunesTrackID(ctx context.Context, trackID int64) (*model.Episode, error)
	GetByGUID(ctx context.Context, podcastID uuid.UUID, guid string) (*model.Episode, error)
	GetRecentByUserID(ctx context.Context, userID uuid.UUID) ([]RecentEpisodeRow, int, error)
	// IsListened は指定ユーザーが指定エピソードを聴取済みかどうかを返します。
	IsListened(ctx context.Context, userID uuid.UUID, episodeID uuid.UUID) (bool, error)
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
//
// userID が nil でない場合、EXISTS サブクエリで各エピソードの聴取状態（listened）も
// 1 クエリで取得します（N+1 回避）。userID が nil の場合、listened は NULL になります。
func (r *episodeRepository) GetByPodcastIDWithStats(ctx context.Context, podcastID uuid.UUID, limit, offset int, userID *uuid.UUID) ([]EpisodeWithStatsRow, int, error) {
	// 1. 総件数を取得
	var total int
	countQuery := `SELECT COUNT(*) FROM episodes WHERE podcast_id = $1`
	if err := r.db.GetContext(ctx, &total, countQuery, podcastID); err != nil {
		return nil, 0, fmt.Errorf("failed to count episodes: %w", err)
	}

	// 2. データ取得（レビュー統計 + 聴取状態付き）
	// 聴取状態は EXISTS サブクエリで判定します。
	// LEFT JOIN だと reviews との Cartesian Product（行の掛け算）が発生し、
	// average_rating / total_reviews の集計値がズレるリスクがあるため、
	// サブクエリで分離しています。
	//
	// userID が指定されている場合:
	//   - EXISTS サブクエリで listening_records にレコードがあるかを判定
	//   - CASE 式で listened フィールドを true/false にマッピング
	// userID が nil の場合:
	//   - $4::uuid IS NOT NULL が false になるため listened は NULL
	dataQuery := `
		SELECT
			e.id,
			e.title,
			e.description,
			e.duration_ms,
			e.published_at,
			COALESCE(AVG(r.rating) FILTER (WHERE u.id IS NOT NULL)::float8, 0) AS average_rating,
			COUNT(r.id) FILTER (WHERE u.id IS NOT NULL)::int AS total_reviews,
			CASE
				WHEN $4::uuid IS NOT NULL THEN EXISTS(
					SELECT 1 FROM listening_records lr
					WHERE lr.episode_id = e.id AND lr.user_id = $4
				)
				ELSE NULL
			END AS listened
		FROM episodes e
		LEFT JOIN reviews r ON e.id = r.episode_id
		LEFT JOIN users u ON r.user_id = u.id AND u.deleted_at IS NULL
		WHERE e.podcast_id = $1
		GROUP BY e.id, e.title, e.description, e.duration_ms, e.published_at
		ORDER BY e.published_at DESC NULLS LAST, e.id DESC
		LIMIT $2 OFFSET $3
	`
	var rows []EpisodeWithStatsRow
	if err := r.db.SelectContext(ctx, &rows, dataQuery, podcastID, limit, offset, userID); err != nil {
		return nil, 0, fmt.Errorf("failed to get episodes with stats: %w", err)
	}

	return rows, total, nil
}

// IsListened は指定ユーザーが指定エピソードを聴取済みかどうかを返します。
// listening_records テーブルに該当レコードが存在するかを EXISTS で判定します。
func (r *episodeRepository) IsListened(ctx context.Context, userID uuid.UUID, episodeID uuid.UUID) (bool, error) {
	var listened bool
	query := `SELECT EXISTS(SELECT 1 FROM listening_records WHERE user_id = $1 AND episode_id = $2)`
	if err := r.db.GetContext(ctx, &listened, query, userID, episodeID); err != nil {
		return false, fmt.Errorf("failed to check listened status: %w", err)
	}
	return listened, nil
}

// GetRecentByUserID はユーザーが記録をつけた番組のうち、まだ聴いていないエピソードを
// 番組ごとにグループ化して取得します。各番組の未聴取エピソードは最新3件まで返します。
//
// 処理ロジック:
//  1. listening_records から、ユーザーが記録をつけた podcast_id をユニークに取得（サブクエリ）
//  2. それらの番組のエピソードのうち、ユーザーがまだ聴取記録をつけていないものを抽出
//  3. ROW_NUMBER() ウィンドウ関数で番組ごとに公開日の新しい順に番号を振り、上位3件を取得
//  4. 番組の最新エピソード公開日が新しい順でソート
//
// ROW_NUMBER() は各行に番組内での順位（1, 2, 3...）を付けるウィンドウ関数で、
// PARTITION BY で番組ごとにグループ化し、ORDER BY で並び順を指定します。
// 外側の WHERE rn <= 3 で各番組から上位3件だけを抽出しています。
//
// total_unlistened は各番組の未聴取エピソード総数です。
// フロントエンドの「もっと見る」表示の判定に使用します。
//
// 戻り値:
//   - rows: 番組ごとにグループ化されたエピソード（各番組最大3件）
//   - recordedPodcastCount: ユーザーが記録をつけた番組の総数
//   - error: エラー
func (r *episodeRepository) GetRecentByUserID(ctx context.Context, userID uuid.UUID) ([]RecentEpisodeRow, int, error) {
	// ユーザーが記録をつけた番組の podcast_id を特定するサブクエリ（共通で使用）
	recordedPodcastSubquery := `
		SELECT DISTINCT ep.podcast_id
		FROM listening_records lr2
		JOIN episodes ep ON lr2.episode_id = ep.id
		WHERE lr2.user_id = $1
	`

	// 「ユーザーが記録をつけた番組の、まだ聴いていないエピソード」の条件を共通化
	whereClause := `
		WHERE e.podcast_id IN (` + recordedPodcastSubquery + `)
		AND NOT EXISTS (
			SELECT 1 FROM listening_records lr3
			WHERE lr3.user_id = $1 AND lr3.episode_id = e.id
		)
	`

	// 1. 記録をつけた番組数を取得（初回利用の判定に使用）
	var recordedPodcastCount int
	podcastCountQuery := `SELECT COUNT(*) FROM (` + recordedPodcastSubquery + `) sub`
	if err := r.db.GetContext(ctx, &recordedPodcastCount, podcastCountQuery, userID); err != nil {
		return nil, 0, fmt.Errorf("failed to count recorded podcasts: %w", err)
	}

	// 2. 番組ごとにグループ化してデータ取得
	// ROW_NUMBER() で番組内の新しい順に番号を振り、上位3件を取得
	// total_unlistened は番組ごとの未聴取エピソード総数（COUNT(*) OVER で計算）
	dataQuery := `
		SELECT
			sub.id,
			sub.title,
			sub.description,
			sub.duration_ms,
			sub.published_at,
			sub.podcast_id,
			sub.podcast_title,
			sub.podcast_artwork_url,
			sub.total_unlistened
		FROM (
			SELECT
				e.id,
				e.title,
				e.description,
				e.duration_ms,
				e.published_at,
				e.podcast_id,
				p.title AS podcast_title,
				p.artwork_url AS podcast_artwork_url,
				ROW_NUMBER() OVER (
					PARTITION BY e.podcast_id
					ORDER BY e.published_at DESC NULLS LAST, e.id DESC
				) AS rn,
				COUNT(*) OVER (PARTITION BY e.podcast_id) AS total_unlistened
			FROM episodes e
			JOIN podcasts p ON e.podcast_id = p.id
	` + whereClause + `
		) sub
		WHERE sub.rn <= 3
		ORDER BY sub.published_at DESC NULLS LAST, sub.id DESC
	`
	var rows []RecentEpisodeRow
	if err := r.db.SelectContext(ctx, &rows, dataQuery, userID); err != nil {
		return nil, 0, fmt.Errorf("failed to get recent episodes: %w", err)
	}

	return rows, recordedPodcastCount, nil
}
