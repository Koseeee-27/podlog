package model

import (
	"time"

	"github.com/google/uuid"
)

// PodcastRequest はユーザーからの番組追加リクエストを表すドメインモデルです。
// ユーザーが「この番組を追加してほしい」とリクエストする機能で使います。
type PodcastRequest struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"-"`           // レスポンスには含めない
	Title     string    `db:"title" json:"title"`
	URL       *string   `db:"url" json:"url,omitempty"`    // 任意項目（Apple Podcasts や Spotify の URL）
	Status    string    `db:"status" json:"status"`        // "pending", "approved", "rejected"
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"-"`         // レスポンスには含めない
}
