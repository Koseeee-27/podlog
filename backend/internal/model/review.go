package model

import (
	"time"

	"github.com/google/uuid"
)

// Review はユーザーのレビューを表すドメインモデルです。
type Review struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	EpisodeID uuid.UUID `db:"episode_id" json:"episode_id"`
	Rating    int       `db:"rating" json:"rating"`
	Comment   *string   `db:"comment" json:"comment,omitempty"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}
