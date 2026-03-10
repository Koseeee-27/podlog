package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/kobayashikosei/podlog/backend/internal/model"
)

// ReviewRepository はレビューデータへのアクセスを提供します。
type ReviewRepository interface {
	Create(ctx context.Context, review *model.Review) error
	Update(ctx context.Context, review *model.Review) error
	Delete(ctx context.Context, userID, episodeID uuid.UUID) error
	GetByUserAndEpisode(ctx context.Context, userID, episodeID uuid.UUID) (*model.Review, error)
	GetByEpisodeID(ctx context.Context, episodeID uuid.UUID, limit, offset int) ([]ReviewWithUserRow, int, error)
	GetAverageRatingByEpisodeID(ctx context.Context, episodeID uuid.UUID) (float64, int, error)
	GetAverageRatingByPodcastID(ctx context.Context, podcastID uuid.UUID) (float64, int, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]ReviewWithDetailsRow, int, error)
	GetTimeline(ctx context.Context, limit, offset int) ([]TimelineRow, int, error)
}

// ReviewWithUserRow はレビュー一覧でユーザー情報を含む JOIN 結果です。
type ReviewWithUserRow struct {
	ID              uuid.UUID `db:"id"`
	UserID          uuid.UUID `db:"user_id"`
	Username        string    `db:"username"`
	DisplayName     string    `db:"display_name"`
	UserAvatarURL   *string   `db:"user_avatar_url"`
	Rating          int       `db:"rating"`
	Comment         *string   `db:"comment"`
	CreatedAt       time.Time `db:"created_at"`
}

// ReviewWithDetailsRow はユーザーのレビュー一覧でエピソード・ポッドキャスト情報を含む JOIN 結果です。
type ReviewWithDetailsRow struct {
	ID                uuid.UUID  `db:"id"`
	Rating            int        `db:"rating"`
	Comment           *string    `db:"comment"`
	CreatedAt         time.Time  `db:"created_at"`
	EpisodeID         uuid.UUID  `db:"episode_id"`
	EpisodeTitle      string     `db:"episode_title"`
	PodcastID         uuid.UUID  `db:"podcast_id"`
	EpisodeArtworkURL *string    `db:"episode_artwork_url"`
	PodcastTitle      string     `db:"podcast_title"`
	PodcastArtworkURL *string    `db:"podcast_artwork_url"`
}

// TimelineRow はタイムラインでユーザー・エピソード・ポッドキャスト情報を含む JOIN 結果です。
type TimelineRow struct {
	ID                uuid.UUID  `db:"id"`
	UserID            uuid.UUID  `db:"user_id"`
	Username          string     `db:"username"`
	DisplayName       string     `db:"display_name"`
	UserAvatarURL     *string    `db:"user_avatar_url"`
	EpisodeID         uuid.UUID  `db:"episode_id"`
	EpisodeTitle      string     `db:"episode_title"`
	EpisodeArtworkURL *string    `db:"episode_artwork_url"`
	PodcastID         uuid.UUID  `db:"podcast_id"`
	PodcastTitle      string     `db:"podcast_title"`
	PodcastArtworkURL *string    `db:"podcast_artwork_url"`
	Rating            int        `db:"rating"`
	Comment           *string    `db:"comment"`
	CreatedAt         time.Time  `db:"created_at"`
}

type reviewRepository struct {
	db *sqlx.DB
}

// NewReviewRepository は ReviewRepository の新しいインスタンスを生成します。
func NewReviewRepository(db *sqlx.DB) ReviewRepository {
	return &reviewRepository{db: db}
}

// Create は新しいレビューをDBに保存します。
func (r *reviewRepository) Create(ctx context.Context, review *model.Review) error {
	query := `
		INSERT INTO reviews (id, user_id, episode_id, rating, comment)
		VALUES (:id, :user_id, :episode_id, :rating, :comment)
	`
	_, err := r.db.NamedExecContext(ctx, query, review)
	if err != nil {
		return fmt.Errorf("failed to create review: %w", err)
	}
	return nil
}

// Update はレビューを更新します。
func (r *reviewRepository) Update(ctx context.Context, review *model.Review) error {
	query := `
		UPDATE reviews
		SET rating = $1, comment = $2, updated_at = NOW()
		WHERE id = $3
	`
	_, err := r.db.ExecContext(ctx, query, review.Rating, review.Comment, review.ID)
	if err != nil {
		return fmt.Errorf("failed to update review: %w", err)
	}
	return nil
}

// Delete はユーザーとエピソードの組み合わせでレビューを削除します。
func (r *reviewRepository) Delete(ctx context.Context, userID, episodeID uuid.UUID) error {
	query := `DELETE FROM reviews WHERE user_id = $1 AND episode_id = $2`
	result, err := r.db.ExecContext(ctx, query, userID, episodeID)
	if err != nil {
		return fmt.Errorf("failed to delete review: %w", err)
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

// GetByUserAndEpisode はユーザーとエピソードの組み合わせでレビューを取得します。
func (r *reviewRepository) GetByUserAndEpisode(ctx context.Context, userID, episodeID uuid.UUID) (*model.Review, error) {
	var review model.Review
	query := `SELECT * FROM reviews WHERE user_id = $1 AND episode_id = $2`
	err := r.db.GetContext(ctx, &review, query, userID, episodeID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get review: %w", err)
	}
	return &review, nil
}

// GetByEpisodeID はエピソードのレビュー一覧をユーザー情報付きで取得します。
func (r *reviewRepository) GetByEpisodeID(ctx context.Context, episodeID uuid.UUID, limit, offset int) ([]ReviewWithUserRow, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.episode_id = $1 AND u.deleted_at IS NULL`
	if err := r.db.GetContext(ctx, &total, countQuery, episodeID); err != nil {
		return nil, 0, fmt.Errorf("failed to count reviews: %w", err)
	}

	query := `
		SELECT
			r.id,
			r.user_id,
			u.username,
			u.display_name,
			u.avatar_url AS user_avatar_url,
			r.rating,
			r.comment,
			r.created_at
		FROM reviews r
		JOIN users u ON r.user_id = u.id
		WHERE r.episode_id = $1 AND u.deleted_at IS NULL
		ORDER BY r.created_at DESC
		LIMIT $2 OFFSET $3
	`
	var rows []ReviewWithUserRow
	if err := r.db.SelectContext(ctx, &rows, query, episodeID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to get reviews: %w", err)
	}

	return rows, total, nil
}

// GetAverageRatingByEpisodeID はエピソードの平均評価とレビュー数を取得します。
func (r *reviewRepository) GetAverageRatingByEpisodeID(ctx context.Context, episodeID uuid.UUID) (float64, int, error) {
	var result struct {
		Average *float64 `db:"average"`
		Count   int      `db:"count"`
	}
	query := `SELECT COALESCE(AVG(r.rating)::float8, 0) AS average, COUNT(*) AS count FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.episode_id = $1 AND u.deleted_at IS NULL`
	if err := r.db.GetContext(ctx, &result, query, episodeID); err != nil {
		return 0, 0, fmt.Errorf("failed to get average rating: %w", err)
	}
	avg := 0.0
	if result.Average != nil {
		avg = *result.Average
	}
	return avg, result.Count, nil
}

// GetAverageRatingByPodcastID はポッドキャストの全エピソードの平均評価とレビュー数を取得します。
func (r *reviewRepository) GetAverageRatingByPodcastID(ctx context.Context, podcastID uuid.UUID) (float64, int, error) {
	var result struct {
		Average *float64 `db:"average"`
		Count   int      `db:"count"`
	}
	query := `
		SELECT COALESCE(AVG(r.rating)::float8, 0) AS average, COUNT(*) AS count
		FROM reviews r
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

// GetByUserID はユーザーのレビュー一覧をエピソード・ポッドキャスト情報付きで取得します。
func (r *reviewRepository) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]ReviewWithDetailsRow, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM reviews WHERE user_id = $1`
	if err := r.db.GetContext(ctx, &total, countQuery, userID); err != nil {
		return nil, 0, fmt.Errorf("failed to count reviews: %w", err)
	}

	query := `
		SELECT
			r.id,
			r.rating,
			r.comment,
			r.created_at,
			e.id AS episode_id,
			e.title AS episode_title,
			e.podcast_id,
			e.artwork_url AS episode_artwork_url,
			p.title AS podcast_title,
			p.artwork_url AS podcast_artwork_url
		FROM reviews r
		JOIN episodes e ON r.episode_id = e.id
		JOIN podcasts p ON e.podcast_id = p.id
		WHERE r.user_id = $1
		ORDER BY r.created_at DESC
		LIMIT $2 OFFSET $3
	`
	var rows []ReviewWithDetailsRow
	if err := r.db.SelectContext(ctx, &rows, query, userID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to get reviews: %w", err)
	}

	return rows, total, nil
}

// GetTimeline は全ユーザーの最新レビューをユーザー・エピソード・ポッドキャスト情報付きで取得します。
func (r *reviewRepository) GetTimeline(ctx context.Context, limit, offset int) ([]TimelineRow, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM reviews r JOIN users u ON r.user_id = u.id WHERE u.deleted_at IS NULL`
	if err := r.db.GetContext(ctx, &total, countQuery); err != nil {
		return nil, 0, fmt.Errorf("failed to count timeline reviews: %w", err)
	}

	query := `
		SELECT
			r.id,
			r.user_id,
			u.username,
			u.display_name,
			u.avatar_url AS user_avatar_url,
			e.id AS episode_id,
			e.title AS episode_title,
			e.artwork_url AS episode_artwork_url,
			p.id AS podcast_id,
			p.title AS podcast_title,
			p.artwork_url AS podcast_artwork_url,
			r.rating,
			r.comment,
			r.created_at
		FROM reviews r
		JOIN users u ON r.user_id = u.id
		JOIN episodes e ON r.episode_id = e.id
		JOIN podcasts p ON e.podcast_id = p.id
		WHERE u.deleted_at IS NULL
		ORDER BY r.created_at DESC
		LIMIT $1 OFFSET $2
	`
	var rows []TimelineRow
	if err := r.db.SelectContext(ctx, &rows, query, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to get timeline: %w", err)
	}

	return rows, total, nil
}
