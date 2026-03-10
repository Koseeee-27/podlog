package model

import (
	"time"

	"github.com/google/uuid"
)

// ListeningRecord はユーザーの聴取記録を表すドメインモデルです。
// ユーザーがエピソードを「聴いた」ことを記録します。
type ListeningRecord struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	EpisodeID uuid.UUID `db:"episode_id" json:"episode_id"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}
