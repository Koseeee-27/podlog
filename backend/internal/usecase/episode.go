package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/model"
	"github.com/kobayashikosei/podlog/backend/internal/repository"
)

// CreateEpisodeInput はエピソード作成のリクエストを表します。
// ハンドラーから受け取ったデータをユースケースに渡す際に使います。
type CreateEpisodeInput struct {
	Title         string  `json:"title"`
	Description   *string `json:"description,omitempty"`
	AudioURL      *string `json:"audio_url,omitempty"`
	ArtworkURL    *string `json:"artwork_url,omitempty"`
	SourceURL     *string `json:"source_url,omitempty"`
	DurationMs    *int64  `json:"duration_ms,omitempty"`
	PublishedAt   *string `json:"published_at,omitempty"`
	ItunesTrackID *int64  `json:"itunes_track_id,omitempty"`
}

// EpisodeUsecase はエピソードに関するビジネスロジックです。
type EpisodeUsecase interface {
	Create(ctx context.Context, podcastID uuid.UUID, input CreateEpisodeInput) (*model.Episode, error)
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

// Create は新しいエピソードを作成してDBに保存します。
//
// 処理の流れ:
//  1. タイトルの必須チェック
//  2. iTunes Track ID が指定されている場合、重複チェック
//  3. UUID を生成してエピソードを作成
//  4. published_at を文字列から time.Time に変換（指定があれば）
//  5. リポジトリ経由でDBに保存
func (u *episodeUsecase) Create(ctx context.Context, podcastID uuid.UUID, input CreateEpisodeInput) (*model.Episode, error) {
	// 1. バリデーション: タイトルは必須
	if input.Title == "" {
		return nil, fmt.Errorf("title is required")
	}

	// 2. iTunes Track ID の重複チェック
	// 同じ iTunes Track ID のエピソードが既に存在する場合はエラーにする
	if input.ItunesTrackID != nil {
		existing, err := u.episodeRepo.GetByItunesTrackID(ctx, *input.ItunesTrackID)
		if err != nil {
			return nil, fmt.Errorf("failed to check existing episode: %w", err)
		}
		if existing != nil {
			return existing, nil
		}
	}

	// 3. published_at の変換（文字列 → time.Time）
	var publishedAt *time.Time
	if input.PublishedAt != nil && *input.PublishedAt != "" {
		t, err := time.Parse(time.RFC3339, *input.PublishedAt)
		if err != nil {
			return nil, fmt.Errorf("invalid published_at format (use RFC3339): %w", err)
		}
		publishedAt = &t
	}

	// 4. エピソードモデルを構築
	episode := &model.Episode{
		ID:            uuid.New(),
		PodcastID:     podcastID,
		ItunesTrackID: input.ItunesTrackID,
		Title:         input.Title,
		Description:   input.Description,
		AudioURL:      input.AudioURL,
		ArtworkURL:    input.ArtworkURL,
		SourceURL:     input.SourceURL,
		DurationMs:    input.DurationMs,
		PublishedAt:   publishedAt,
	}

	// 5. DBに保存
	if err := u.episodeRepo.Create(ctx, episode); err != nil {
		return nil, fmt.Errorf("failed to create episode: %w", err)
	}

	return episode, nil
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
