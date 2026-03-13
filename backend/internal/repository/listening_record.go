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

// ListeningRecordRepository は聴取記録データへのアクセスを提供します。
type ListeningRecordRepository interface {
	Create(ctx context.Context, record *model.ListeningRecord) error
	Delete(ctx context.Context, userID, episodeID uuid.UUID) error
	GetByUserAndEpisode(ctx context.Context, userID, episodeID uuid.UUID) (*model.ListeningRecord, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]ListeningRecordRow, int, error)
}

// ListeningRecordRow は聴取履歴一覧の JOIN クエリ結果を受け取る構造体です。
// sqlx の db タグでカラム名と対応付けます。
type ListeningRecordRow struct {
	ID                uuid.UUID  `db:"id"`
	EpisodeID         uuid.UUID  `db:"episode_id"`
	EpisodeTitle      string     `db:"episode_title"`
	PodcastID         uuid.UUID  `db:"podcast_id"`
	EpisodeArtworkURL *string    `db:"episode_artwork_url"`
	PublishedAt       *time.Time `db:"published_at"`
	PodcastTitle      string     `db:"podcast_title"`
	PodcastArtworkURL *string    `db:"podcast_artwork_url"`
	CreatedAt         time.Time  `db:"created_at"`
}

type listeningRecordRepository struct {
	db *sqlx.DB
}

// NewListeningRecordRepository は ListeningRecordRepository の新しいインスタンスを生成します。
func NewListeningRecordRepository(db *sqlx.DB) ListeningRecordRepository {
	return &listeningRecordRepository{db: db}
}

// Create は新しい聴取記録をDBに保存します。
func (r *listeningRecordRepository) Create(ctx context.Context, record *model.ListeningRecord) error {
	query := `
		INSERT INTO listening_records (id, user_id, episode_id)
		VALUES (:id, :user_id, :episode_id)
	`
	_, err := r.db.NamedExecContext(ctx, query, record)
	if err != nil {
		return fmt.Errorf("failed to create listening record: %w", err)
	}
	return nil
}

// Delete はユーザーとエピソードの組み合わせで聴取記録を削除します。
func (r *listeningRecordRepository) Delete(ctx context.Context, userID, episodeID uuid.UUID) error {
	query := `DELETE FROM listening_records WHERE user_id = $1 AND episode_id = $2`
	result, err := r.db.ExecContext(ctx, query, userID, episodeID)
	if err != nil {
		return fmt.Errorf("failed to delete listening record: %w", err)
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

// GetByUserAndEpisode はユーザーとエピソードの組み合わせで聴取記録を取得します。
func (r *listeningRecordRepository) GetByUserAndEpisode(ctx context.Context, userID, episodeID uuid.UUID) (*model.ListeningRecord, error) {
	var record model.ListeningRecord
	query := `SELECT * FROM listening_records WHERE user_id = $1 AND episode_id = $2`
	err := r.db.GetContext(ctx, &record, query, userID, episodeID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get listening record: %w", err)
	}
	return &record, nil
}

// GetByUserID はユーザーの聴取履歴一覧をエピソード・ポッドキャスト情報付きで取得します。
// total（総件数）も返すことでフロントエンドのページネーションに対応します。
func (r *listeningRecordRepository) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]ListeningRecordRow, int, error) {
	// 総件数を取得
	var total int
	countQuery := `SELECT COUNT(*) FROM listening_records WHERE user_id = $1`
	if err := r.db.GetContext(ctx, &total, countQuery, userID); err != nil {
		return nil, 0, fmt.Errorf("failed to count listening records: %w", err)
	}

	// エピソード・ポッドキャスト情報を JOIN して取得
	query := `
		SELECT
			lr.id,
			lr.created_at,
			e.id AS episode_id,
			e.title AS episode_title,
			e.podcast_id,
			e.artwork_url AS episode_artwork_url,
			e.published_at,
			p.title AS podcast_title,
			p.artwork_url AS podcast_artwork_url
		FROM listening_records lr
		JOIN episodes e ON lr.episode_id = e.id
		JOIN podcasts p ON e.podcast_id = p.id
		WHERE lr.user_id = $1
		ORDER BY lr.created_at DESC
		LIMIT $2 OFFSET $3
	`
	var rows []ListeningRecordRow
	if err := r.db.SelectContext(ctx, &rows, query, userID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to get listening records: %w", err)
	}

	return rows, total, nil
}

