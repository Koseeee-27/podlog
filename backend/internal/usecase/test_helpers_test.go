package usecase

import (
	"time"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
)

// newTestEpisode はテスト用のエピソードを生成します。
func newTestEpisode() *model.Episode {
	return &model.Episode{
		ID:        uuid.New(),
		PodcastID: uuid.New(),
		Title:     "テストエピソード",
	}
}

// newTestRating はテスト用の評価を生成します。
func newTestRating(userID, episodeID uuid.UUID) *model.Rating {
	now := time.Now()
	return &model.Rating{
		ID:        uuid.New(),
		UserID:    userID,
		EpisodeID: episodeID,
		Rating:    4,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// newTestRecord はテスト用の聴取記録を生成します。
func newTestRecord(userID, episodeID uuid.UUID) *model.ListeningRecord {
	return &model.ListeningRecord{
		ID:        uuid.New(),
		UserID:    userID,
		EpisodeID: episodeID,
		CreatedAt: time.Now(),
	}
}
