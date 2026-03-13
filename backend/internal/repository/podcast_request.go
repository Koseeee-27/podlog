package repository

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/kobayashikosei/podlog/backend/internal/model"
)

// PodcastRequestRepository は番組追加リクエストデータへのアクセスを提供します。
// インターフェースを定義することで、テスト時にモック（偽の実装）に差し替えられます。
type PodcastRequestRepository interface {
	// Create は新しい番組追加リクエストをDBに保存します。
	Create(ctx context.Context, req *model.PodcastRequest) error
}

// podcastRequestRepository は PodcastRequestRepository の実装です。
// sqlx.DB を使って実際にPostgreSQLにアクセスします。
type podcastRequestRepository struct {
	db *sqlx.DB
}

// NewPodcastRequestRepository は PodcastRequestRepository の新しいインスタンスを生成します。
func NewPodcastRequestRepository(db *sqlx.DB) PodcastRequestRepository {
	return &podcastRequestRepository{db: db}
}

// Create は新しい番組追加リクエストをDBに保存します。
// RETURNING 句で DB が生成した created_at と status を取得し、
// 引数の req に反映します（レスポンスで正確な値を返すため）。
func (r *podcastRequestRepository) Create(ctx context.Context, req *model.PodcastRequest) error {
	query := `
		INSERT INTO podcast_requests (id, user_id, title, url)
		VALUES ($1, $2, $3, $4)
		RETURNING status, created_at
	`
	err := r.db.QueryRowContext(ctx, query, req.ID, req.UserID, req.Title, req.URL).
		Scan(&req.Status, &req.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create podcast request: %w", err)
	}
	return nil
}
