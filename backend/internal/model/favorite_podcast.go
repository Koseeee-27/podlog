package model

import (
	"time"

	"github.com/google/uuid"
)

// FavoritePodcast はユーザーの「好きな番組」を表すドメインモデルです。
// favorite_podcasts テーブルに対応します。
type FavoritePodcast struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	PodcastID uuid.UUID `db:"podcast_id" json:"podcast_id"`
	Position  int       `db:"position" json:"position"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}
