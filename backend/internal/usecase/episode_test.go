package usecase

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/model"
)

// mockEpisodeRepo は EpisodeRepository のモック（テスト用の偽実装）です。
// 各メソッドの動作を関数フィールドで差し替えられるようにしています。
type mockEpisodeRepo struct {
	createFunc           func(ctx context.Context, episode *model.Episode) error
	getByIDFunc          func(ctx context.Context, id uuid.UUID) (*model.Episode, error)
	getByPodcastIDFunc   func(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error)
	getByItunesTrackIDFunc func(ctx context.Context, trackID int64) (*model.Episode, error)
}

func (m *mockEpisodeRepo) Create(ctx context.Context, episode *model.Episode) error {
	return m.createFunc(ctx, episode)
}

func (m *mockEpisodeRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Episode, error) {
	return m.getByIDFunc(ctx, id)
}

func (m *mockEpisodeRepo) GetByPodcastID(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error) {
	return m.getByPodcastIDFunc(ctx, podcastID, limit, offset)
}

func (m *mockEpisodeRepo) GetByItunesTrackID(ctx context.Context, trackID int64) (*model.Episode, error) {
	return m.getByItunesTrackIDFunc(ctx, trackID)
}

func TestCreateEpisode_Success(t *testing.T) {
	podcastID := uuid.New()
	repo := &mockEpisodeRepo{
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil // 作成成功
		},
	}
	uc := NewEpisodeUsecase(repo)

	episode, err := uc.Create(context.Background(), podcastID, CreateEpisodeInput{
		Title: "テストエピソード #1",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if episode.Title != "テストエピソード #1" {
		t.Errorf("expected title 'テストエピソード #1', got '%s'", episode.Title)
	}
	if episode.PodcastID != podcastID {
		t.Errorf("expected podcast_id %s, got %s", podcastID, episode.PodcastID)
	}
	if episode.ID == uuid.Nil {
		t.Error("expected non-nil UUID for episode ID")
	}
}

func TestCreateEpisode_WithAllFields(t *testing.T) {
	podcastID := uuid.New()
	description := "エピソードの説明"
	audioURL := "https://example.com/audio.mp3"
	artworkURL := "https://example.com/artwork.jpg"
	sourceURL := "https://example.com/episode"
	durationMs := int64(3600000)
	publishedAt := "2026-01-15T10:00:00Z"

	repo := &mockEpisodeRepo{
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}
	uc := NewEpisodeUsecase(repo)

	episode, err := uc.Create(context.Background(), podcastID, CreateEpisodeInput{
		Title:       "フルフィールドエピソード",
		Description: &description,
		AudioURL:    &audioURL,
		ArtworkURL:  &artworkURL,
		SourceURL:   &sourceURL,
		DurationMs:  &durationMs,
		PublishedAt: &publishedAt,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if episode.Title != "フルフィールドエピソード" {
		t.Errorf("expected title 'フルフィールドエピソード', got '%s'", episode.Title)
	}
	if episode.Description == nil || *episode.Description != description {
		t.Error("expected description to be set")
	}
	if episode.AudioURL == nil || *episode.AudioURL != audioURL {
		t.Error("expected audio_url to be set")
	}
	if episode.PublishedAt == nil {
		t.Error("expected published_at to be set")
	}
}

func TestCreateEpisode_EmptyTitle(t *testing.T) {
	repo := &mockEpisodeRepo{}
	uc := NewEpisodeUsecase(repo)

	_, err := uc.Create(context.Background(), uuid.New(), CreateEpisodeInput{
		Title: "", // 空のタイトル
	})
	if err == nil {
		t.Fatal("expected error for empty title, got nil")
	}
}

func TestCreateEpisode_DuplicateItunesTrackID(t *testing.T) {
	existingEpisode := &model.Episode{
		ID:    uuid.New(),
		Title: "既存エピソード",
	}
	trackID := int64(12345)

	repo := &mockEpisodeRepo{
		getByItunesTrackIDFunc: func(ctx context.Context, id int64) (*model.Episode, error) {
			return existingEpisode, nil // 既に存在する
		},
	}
	uc := NewEpisodeUsecase(repo)

	episode, err := uc.Create(context.Background(), uuid.New(), CreateEpisodeInput{
		Title:         "新しいエピソード",
		ItunesTrackID: &trackID,
	})
	if err != nil {
		t.Fatalf("expected no error for duplicate (should return existing), got %v", err)
	}
	if episode.ID != existingEpisode.ID {
		t.Errorf("expected existing episode ID %s, got %s", existingEpisode.ID, episode.ID)
	}
}

func TestCreateEpisode_InvalidPublishedAt(t *testing.T) {
	repo := &mockEpisodeRepo{}
	uc := NewEpisodeUsecase(repo)

	invalidDate := "not-a-date"
	_, err := uc.Create(context.Background(), uuid.New(), CreateEpisodeInput{
		Title:       "テスト",
		PublishedAt: &invalidDate,
	})
	if err == nil {
		t.Fatal("expected error for invalid published_at, got nil")
	}
}

func TestCreateEpisode_DBError(t *testing.T) {
	repo := &mockEpisodeRepo{
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return fmt.Errorf("database connection failed")
		},
	}
	uc := NewEpisodeUsecase(repo)

	_, err := uc.Create(context.Background(), uuid.New(), CreateEpisodeInput{
		Title: "テスト",
	})
	if err == nil {
		t.Fatal("expected error for DB failure, got nil")
	}
}

func TestGetEpisodeByID_Success(t *testing.T) {
	episodeID := uuid.New()
	expected := &model.Episode{
		ID:    episodeID,
		Title: "テストエピソード",
	}

	repo := &mockEpisodeRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.Episode, error) {
			return expected, nil
		},
	}
	uc := NewEpisodeUsecase(repo)

	episode, err := uc.GetByID(context.Background(), episodeID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if episode.ID != episodeID {
		t.Errorf("expected episode ID %s, got %s", episodeID, episode.ID)
	}
}

func TestGetEpisodeByID_NotFound(t *testing.T) {
	repo := &mockEpisodeRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.Episode, error) {
			return nil, nil // 見つからない
		},
	}
	uc := NewEpisodeUsecase(repo)

	_, err := uc.GetByID(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error for non-existent episode, got nil")
	}
}

func TestGetEpisodesByPodcastID_Success(t *testing.T) {
	podcastID := uuid.New()
	expected := []model.Episode{
		{ID: uuid.New(), Title: "Episode 1"},
		{ID: uuid.New(), Title: "Episode 2"},
	}

	repo := &mockEpisodeRepo{
		getByPodcastIDFunc: func(ctx context.Context, pid uuid.UUID, limit, offset int) ([]model.Episode, error) {
			return expected, nil
		},
	}
	uc := NewEpisodeUsecase(repo)

	episodes, err := uc.GetByPodcastID(context.Background(), podcastID, 20, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(episodes) != 2 {
		t.Errorf("expected 2 episodes, got %d", len(episodes))
	}
}

func TestGetEpisodesByPodcastID_LimitClamp(t *testing.T) {
	repo := &mockEpisodeRepo{
		getByPodcastIDFunc: func(ctx context.Context, pid uuid.UUID, limit, offset int) ([]model.Episode, error) {
			if limit != 20 {
				return nil, fmt.Errorf("expected limit to be clamped to 20, got %d", limit)
			}
			return []model.Episode{}, nil
		},
	}
	uc := NewEpisodeUsecase(repo)

	// limit=0 は 20 にクランプされるべき
	_, err := uc.GetByPodcastID(context.Background(), uuid.New(), 0, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// limit=200 も 20 にクランプされるべき
	_, err = uc.GetByPodcastID(context.Background(), uuid.New(), 200, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}
