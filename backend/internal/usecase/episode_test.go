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
// 未設定のまま呼ばれた場合は panic ではなく明示的なエラーを返します。
type mockEpisodeRepo struct {
	createFunc             func(ctx context.Context, episode *model.Episode) error
	getByIDFunc            func(ctx context.Context, id uuid.UUID) (*model.Episode, error)
	getByPodcastIDFunc     func(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error)
	getByItunesTrackIDFunc func(ctx context.Context, trackID int64) (*model.Episode, error)
}

func (m *mockEpisodeRepo) Create(ctx context.Context, episode *model.Episode) error {
	if m.createFunc == nil {
		return fmt.Errorf("mockEpisodeRepo.Create: not implemented")
	}
	return m.createFunc(ctx, episode)
}

func (m *mockEpisodeRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Episode, error) {
	if m.getByIDFunc == nil {
		return nil, fmt.Errorf("mockEpisodeRepo.GetByID: not implemented")
	}
	return m.getByIDFunc(ctx, id)
}

func (m *mockEpisodeRepo) GetByPodcastID(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error) {
	if m.getByPodcastIDFunc == nil {
		return nil, fmt.Errorf("mockEpisodeRepo.GetByPodcastID: not implemented")
	}
	return m.getByPodcastIDFunc(ctx, podcastID, limit, offset)
}

func (m *mockEpisodeRepo) GetByItunesTrackID(ctx context.Context, trackID int64) (*model.Episode, error) {
	if m.getByItunesTrackIDFunc == nil {
		return nil, fmt.Errorf("mockEpisodeRepo.GetByItunesTrackID: not implemented")
	}
	return m.getByItunesTrackIDFunc(ctx, trackID)
}

// ── Create テスト ──

func TestCreateEpisode_Success(t *testing.T) {
	podcastID := uuid.New()
	repo := &mockEpisodeRepo{
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}
	uc := NewEpisodeUsecase(repo)

	result, err := uc.Create(context.Background(), podcastID, CreateEpisodeInput{
		Title: "テストエピソード #1",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !result.Created {
		t.Error("expected Created to be true for new episode")
	}
	if result.Episode.Title != "テストエピソード #1" {
		t.Errorf("expected title 'テストエピソード #1', got '%s'", result.Episode.Title)
	}
	if result.Episode.PodcastID != podcastID {
		t.Errorf("expected podcast_id %s, got %s", podcastID, result.Episode.PodcastID)
	}
	if result.Episode.ID == uuid.Nil {
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

	result, err := uc.Create(context.Background(), podcastID, CreateEpisodeInput{
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
	if !result.Created {
		t.Error("expected Created to be true")
	}
	ep := result.Episode
	if ep.Title != "フルフィールドエピソード" {
		t.Errorf("expected title 'フルフィールドエピソード', got '%s'", ep.Title)
	}
	if ep.Description == nil || *ep.Description != description {
		t.Error("expected description to be set")
	}
	if ep.AudioURL == nil || *ep.AudioURL != audioURL {
		t.Error("expected audio_url to be set")
	}
	if ep.PublishedAt == nil {
		t.Error("expected published_at to be set")
	}
}

func TestCreateEpisode_TitleTrimmed(t *testing.T) {
	repo := &mockEpisodeRepo{
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}
	uc := NewEpisodeUsecase(repo)

	result, err := uc.Create(context.Background(), uuid.New(), CreateEpisodeInput{
		Title: "  前後に空白  ",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Episode.Title != "前後に空白" {
		t.Errorf("expected trimmed title '前後に空白', got '%s'", result.Episode.Title)
	}
}

func TestCreateEpisode_EmptyTitle(t *testing.T) {
	repo := &mockEpisodeRepo{}
	uc := NewEpisodeUsecase(repo)

	_, err := uc.Create(context.Background(), uuid.New(), CreateEpisodeInput{
		Title: "",
	})
	if err == nil {
		t.Fatal("expected error for empty title, got nil")
	}
}

func TestCreateEpisode_WhitespaceOnlyTitle(t *testing.T) {
	repo := &mockEpisodeRepo{}
	uc := NewEpisodeUsecase(repo)

	_, err := uc.Create(context.Background(), uuid.New(), CreateEpisodeInput{
		Title: "   \t\n  ",
	})
	if err == nil {
		t.Fatal("expected error for whitespace-only title, got nil")
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
			return existingEpisode, nil
		},
	}
	uc := NewEpisodeUsecase(repo)

	result, err := uc.Create(context.Background(), uuid.New(), CreateEpisodeInput{
		Title:         "新しいエピソード",
		ItunesTrackID: &trackID,
	})
	if err != nil {
		t.Fatalf("expected no error for duplicate (should return existing), got %v", err)
	}
	if result.Created {
		t.Error("expected Created to be false for existing episode")
	}
	if result.Episode.ID != existingEpisode.ID {
		t.Errorf("expected existing episode ID %s, got %s", existingEpisode.ID, result.Episode.ID)
	}
}

func TestCreateEpisode_UniqueViolationFallback(t *testing.T) {
	// 並行リクエストにより、事前チェックでは未存在だが INSERT 時に UNIQUE 違反が発生するケース
	existingEpisode := &model.Episode{
		ID:    uuid.New(),
		Title: "先に作られたエピソード",
	}
	trackID := int64(99999)

	repo := &mockEpisodeRepo{
		getByItunesTrackIDFunc: func() func(ctx context.Context, trackID int64) (*model.Episode, error) {
			callCount := 0
			return func(ctx context.Context, trackID int64) (*model.Episode, error) {
				callCount++
				if callCount == 1 {
					// 事前チェック: まだ存在しない
					return nil, nil
				}
				// UNIQUE 違反後のフォールバック取得: 既存が見つかる
				return existingEpisode, nil
			}
		}(),
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			// UNIQUE 違反を模擬
			return fmt.Errorf("duplicate key value violates unique constraint")
		},
	}
	uc := NewEpisodeUsecase(repo)

	result, err := uc.Create(context.Background(), uuid.New(), CreateEpisodeInput{
		Title:         "並行リクエストで作成",
		ItunesTrackID: &trackID,
	})
	if err != nil {
		t.Fatalf("expected no error after unique violation fallback, got %v", err)
	}
	if result.Created {
		t.Error("expected Created to be false after unique violation fallback")
	}
	if result.Episode.ID != existingEpisode.ID {
		t.Errorf("expected existing episode ID %s, got %s", existingEpisode.ID, result.Episode.ID)
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

// ── GetByID テスト ──

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
			return nil, nil
		},
	}
	uc := NewEpisodeUsecase(repo)

	_, err := uc.GetByID(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error for non-existent episode, got nil")
	}
}

// ── GetByPodcastID テスト ──

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
