package model

import (
	"time"

	"github.com/google/uuid"
)

// Comment はユーザーがエピソードに投稿したテキスト感想を表すドメインモデルです。
//
// 評価（model.Rating）とは独立した別オブジェクトで、**1ユーザー1エピソードに対して
// 複数件投稿可能**（unique 制約なし）。更新・削除はコメント ID 単位で行います
// （所有者チェックは usecase 層で実施）。
//
// body は VARCHAR(1000) で、DB の `comments_body_length_check`（1〜1000 文字）でも
// 担保されますが、usecase 層でも事前にバリデーションして 400 を返します。
type Comment struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	EpisodeID uuid.UUID `db:"episode_id" json:"episode_id"`
	Body      string    `db:"body" json:"body"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}
