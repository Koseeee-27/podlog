package model

import (
	"time"

	"github.com/google/uuid"
)

// Podcast はポッドキャスト番組を表すドメインモデルです。
type Podcast struct {
	ID          uuid.UUID `db:"id" json:"id"`
	ItunesID    *int64    `db:"itunes_id" json:"itunes_id,omitempty"`
	Title       string    `db:"title" json:"title"`
	Author      *string   `db:"author" json:"author,omitempty"`
	Description *string   `db:"description" json:"description,omitempty"`
	FeedURL     *string   `db:"feed_url" json:"feed_url,omitempty"`
	ArtworkURL  *string   `db:"artwork_url" json:"artwork_url,omitempty"`
	ItunesURL   *string   `db:"itunes_url" json:"itunes_url,omitempty"`
	Genre       *string   `db:"genre" json:"genre,omitempty"`
	SourceType  string    `db:"source_type" json:"source_type"`
	SourceURL   *string   `db:"source_url" json:"source_url,omitempty"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}
