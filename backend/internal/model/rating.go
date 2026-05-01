package model

import (
	"time"

	"github.com/google/uuid"
)

// Rating はユーザーがエピソードに付けた星評価（1〜5）を表すドメインモデルです。
//
// 旧 Review モデル（rating + comment 同居）からコメントを分離した「評価のみ」のモデルです。
// 1ユーザー1エピソード=1件（重複不可）。感想は別オブジェクト（model.Comment）として独立して
// 投稿します。
type Rating struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	EpisodeID uuid.UUID `db:"episode_id" json:"episode_id"`
	Rating    int       `db:"rating" json:"rating"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}
