package model

import (
	"time"

	"github.com/google/uuid"
)

// Episode はポッドキャストのエピソード（個別の放送回）を表すドメインモデルです。
type Episode struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	PodcastID      uuid.UUID  `db:"podcast_id" json:"podcast_id"`
	ItunesTrackID  *int64     `db:"itunes_track_id" json:"itunes_track_id,omitempty"`
	Title          string     `db:"title" json:"title"`
	Description    *string    `db:"description" json:"description,omitempty"`
	AudioURL       *string    `db:"audio_url" json:"audio_url,omitempty"`
	ArtworkURL     *string    `db:"artwork_url" json:"artwork_url,omitempty"`
	SourceURL      *string    `db:"source_url" json:"source_url,omitempty"`
	DurationMs     *int64     `db:"duration_ms" json:"duration_ms,omitempty"`
	PublishedAt    *time.Time `db:"published_at" json:"published_at,omitempty"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

// EpisodeWithStats はエピソード詳細にレビュー統計を付加した構造体です。
type EpisodeWithStats struct {
	Episode
	ReviewCount  int     `json:"review_count"`
	AverageRating float64 `json:"average_rating"`
}
