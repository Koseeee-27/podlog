package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/model"
	"github.com/kobayashikosei/podlog/backend/internal/repository"
)

// EpisodeUsecase はエピソードに関するビジネスロジックです。
type EpisodeUsecase interface {
	GetByID(ctx context.Context, id uuid.UUID) (*model.Episode, error)
	GetByPodcastID(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error)
}

type episodeUsecase struct {
	episodeRepo repository.EpisodeRepository
}

// NewEpisodeUsecase は EpisodeUsecase の新しいインスタンスを生成します。
func NewEpisodeUsecase(episodeRepo repository.EpisodeRepository) EpisodeUsecase {
	return &episodeUsecase{episodeRepo: episodeRepo}
}

// GetByID は UUID でエピソードを取得します。
func (u *episodeUsecase) GetByID(ctx context.Context, id uuid.UUID) (*model.Episode, error) {
	episode, err := u.episodeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get episode: %w", err)
	}
	if episode == nil {
		return nil, fmt.Errorf("episode not found")
	}
	return episode, nil
}

// GetByPodcastID はポッドキャストIDに紐づくエピソード一覧を取得します。
func (u *episodeUsecase) GetByPodcastID(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	episodes, err := u.episodeRepo.GetByPodcastID(ctx, podcastID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get episodes: %w", err)
	}
	return episodes, nil
}
