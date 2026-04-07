package usecase

import (
	"context"
	"fmt"
	"math"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/external/rss"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// mockEpisodeRepo は EpisodeRepository のモック（テスト用の偽実装）です。
// 各メソッドの動作を関数フィールドで差し替えられるようにしています。
// 未設定のまま呼ばれた場合は panic ではなく明示的なエラーを返します。
type mockEpisodeRepo struct {
	createFunc                  func(ctx context.Context, episode *model.Episode) error
	getByIDFunc                 func(ctx context.Context, id uuid.UUID) (*model.Episode, error)
	getByPodcastIDFunc          func(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error)
	getByPodcastIDWithStatsFunc func(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]repository.EpisodeWithStatsRow, int, error)
	getByItunesTrackIDFunc      func(ctx context.Context, trackID int64) (*model.Episode, error)
	getByGUIDFunc               func(ctx context.Context, podcastID uuid.UUID, guid string) (*model.Episode, error)
	getRecentByUserIDFunc       func(ctx context.Context, userID uuid.UUID) ([]repository.RecentEpisodeRow, int, error)
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

func (m *mockEpisodeRepo) GetByGUID(ctx context.Context, podcastID uuid.UUID, guid string) (*model.Episode, error) {
	if m.getByGUIDFunc == nil {
		return nil, fmt.Errorf("mockEpisodeRepo.GetByGUID: not implemented")
	}
	return m.getByGUIDFunc(ctx, podcastID, guid)
}

func (m *mockEpisodeRepo) GetByPodcastIDWithStats(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]repository.EpisodeWithStatsRow, int, error) {
	if m.getByPodcastIDWithStatsFunc == nil {
		return nil, 0, fmt.Errorf("mockEpisodeRepo.GetByPodcastIDWithStats: not implemented")
	}
	return m.getByPodcastIDWithStatsFunc(ctx, podcastID, limit, offset)
}

func (m *mockEpisodeRepo) GetRecentByUserID(ctx context.Context, userID uuid.UUID) ([]repository.RecentEpisodeRow, int, error) {
	if m.getRecentByUserIDFunc == nil {
		return nil, 0, fmt.Errorf("mockEpisodeRepo.GetRecentByUserID: not implemented")
	}
	return m.getRecentByUserIDFunc(ctx, userID)
}

// mockPodcastRepoForEpisode は EpisodeUsecase テスト用の PodcastRepository モックです。
// GetByID の戻り値を制御するための関数フィールドを持ちます。
// updateFeedLastFetchedAtCalled で UpdateFeedLastFetchedAt の呼び出しを検証できます。
type mockPodcastRepoForEpisode struct {
	getByIDFunc                    func(ctx context.Context, id uuid.UUID) (*model.Podcast, error)
	updateFeedLastFetchedAtCalled  bool
}

func (m *mockPodcastRepoForEpisode) Create(ctx context.Context, podcast *model.Podcast) error {
	return nil
}
func (m *mockPodcastRepoForEpisode) GetByID(ctx context.Context, id uuid.UUID) (*model.Podcast, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, nil
}
func (m *mockPodcastRepoForEpisode) GetByItunesID(ctx context.Context, itunesID int64) (*model.Podcast, error) {
	return nil, nil
}
func (m *mockPodcastRepoForEpisode) Search(ctx context.Context, query string, genres []string, limit, offset int) ([]repository.PodcastSearchRow, int, error) {
	return nil, 0, nil
}
func (m *mockPodcastRepoForEpisode) GetPopular(ctx context.Context, limit int) ([]repository.PodcastSearchRow, error) {
	return nil, nil
}
func (m *mockPodcastRepoForEpisode) GetDistinctGenres(ctx context.Context) ([]string, error) {
	return nil, nil
}
func (m *mockPodcastRepoForEpisode) ExistsByIDs(ctx context.Context, ids []uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (m *mockPodcastRepoForEpisode) UpdateGenre(ctx context.Context, id uuid.UUID, genre string) error {
	return nil
}
func (m *mockPodcastRepoForEpisode) ListWithoutGenre(ctx context.Context) ([]model.Podcast, error) {
	return nil, nil
}
func (m *mockPodcastRepoForEpisode) ListWithoutEpisodes(ctx context.Context) ([]model.Podcast, error) {
	return nil, nil
}
func (m *mockPodcastRepoForEpisode) UpdateFeedLastFetchedAt(ctx context.Context, id uuid.UUID) error {
	m.updateFeedLastFetchedAtCalled = true
	return nil
}

// mockRSSFetcher は rss.Fetcher のモックです。
type mockRSSFetcher struct {
	fetchFunc func(ctx context.Context, feedURL string) ([]rss.FeedItem, error)
}

func (m *mockRSSFetcher) Fetch(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
	if m.fetchFunc == nil {
		return nil, fmt.Errorf("mockRSSFetcher.Fetch: not implemented")
	}
	return m.fetchFunc(ctx, feedURL)
}

// ── Create テスト ──

func TestCreateEpisode_Success(t *testing.T) {
	podcastID := uuid.New()
	repo := &mockEpisodeRepo{
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

	_, err := uc.Create(context.Background(), uuid.New(), CreateEpisodeInput{
		Title: "",
	})
	if err == nil {
		t.Fatal("expected error for empty title, got nil")
	}
}

func TestCreateEpisode_WhitespaceOnlyTitle(t *testing.T) {
	repo := &mockEpisodeRepo{}
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)

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

// ── FetchFromFeed テスト ──

func TestFetchFromFeed_NewEpisodes(t *testing.T) {
	// RSS フィードから新規エピソードを取得するケース
	podcastID := uuid.New()
	now := time.Now()

	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
			dur := int64(3600000)
			return []rss.FeedItem{
				{
					Title:       "新しいエピソード1",
					Description: "説明1",
					GUID:        "guid-001",
					AudioURL:    "https://example.com/ep1.mp3",
					DurationMs:  &dur,
					PubDate:     &now,
				},
				{
					Title: "新しいエピソード2",
					GUID:  "guid-002",
				},
			}, nil
		},
	}

	repo := &mockEpisodeRepo{
		getByGUIDFunc: func(ctx context.Context, pid uuid.UUID, guid string) (*model.Episode, error) {
			// どちらも未登録
			return nil, nil
		},
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, fetcher)
	result, err := uc.FetchFromFeed(context.Background(), podcastID, "https://example.com/feed.xml")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.NewCount != 2 {
		t.Errorf("expected 2 new episodes, got %d", result.NewCount)
	}
	if result.SkippedCount != 0 {
		t.Errorf("expected 0 skipped, got %d", result.SkippedCount)
	}
	if len(result.Episodes) != 2 {
		t.Errorf("expected 2 episodes in result, got %d", len(result.Episodes))
	}
}

func TestFetchFromFeed_AllDuplicate(t *testing.T) {
	// 全てのエピソードが既に登録済みのケース
	podcastID := uuid.New()

	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
			return []rss.FeedItem{
				{Title: "既存1", GUID: "guid-001"},
				{Title: "既存2", GUID: "guid-002"},
			}, nil
		},
	}

	repo := &mockEpisodeRepo{
		getByGUIDFunc: func(ctx context.Context, pid uuid.UUID, guid string) (*model.Episode, error) {
			// 全て登録済み
			return &model.Episode{ID: uuid.New(), Title: "既存"}, nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, fetcher)
	result, err := uc.FetchFromFeed(context.Background(), podcastID, "https://example.com/feed.xml")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.NewCount != 0 {
		t.Errorf("expected 0 new, got %d", result.NewCount)
	}
	if result.SkippedCount != 2 {
		t.Errorf("expected 2 skipped, got %d", result.SkippedCount)
	}
}

func TestFetchFromFeed_MixedNewAndExisting(t *testing.T) {
	// 新規と既存が混在するケース
	podcastID := uuid.New()

	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
			return []rss.FeedItem{
				{Title: "新規", GUID: "new-001"},
				{Title: "既存", GUID: "existing-001"},
				{Title: "新規2", GUID: "new-002"},
			}, nil
		},
	}

	repo := &mockEpisodeRepo{
		getByGUIDFunc: func(ctx context.Context, pid uuid.UUID, guid string) (*model.Episode, error) {
			if guid == "existing-001" {
				return &model.Episode{ID: uuid.New(), Title: "既存"}, nil
			}
			return nil, nil
		},
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, fetcher)
	result, err := uc.FetchFromFeed(context.Background(), podcastID, "https://example.com/feed.xml")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.NewCount != 2 {
		t.Errorf("expected 2 new, got %d", result.NewCount)
	}
	if result.SkippedCount != 1 {
		t.Errorf("expected 1 skipped, got %d", result.SkippedCount)
	}
}

func TestFetchFromFeed_RSSError(t *testing.T) {
	// RSS フィード取得時にエラーが発生するケース
	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
			return nil, fmt.Errorf("network error")
		},
	}

	repo := &mockEpisodeRepo{}
	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, fetcher)

	_, err := uc.FetchFromFeed(context.Background(), uuid.New(), "https://example.com/feed.xml")
	if err == nil {
		t.Fatal("expected error for RSS fetch failure, got nil")
	}
}

func TestFetchFromFeed_SkipsItemsWithoutGUID(t *testing.T) {
	// GUID がないアイテムはスキップされるケース
	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
			return []rss.FeedItem{
				{Title: "GUIDなし", GUID: ""},
				{Title: "GUIDあり", GUID: "guid-001"},
			}, nil
		},
	}

	repo := &mockEpisodeRepo{
		getByGUIDFunc: func(ctx context.Context, pid uuid.UUID, guid string) (*model.Episode, error) {
			return nil, nil
		},
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, fetcher)
	result, err := uc.FetchFromFeed(context.Background(), uuid.New(), "https://example.com/feed.xml")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.NewCount != 1 {
		t.Errorf("expected 1 new, got %d", result.NewCount)
	}
	if result.SkippedCount != 1 {
		t.Errorf("expected 1 skipped (no GUID), got %d", result.SkippedCount)
	}
}

func TestFetchFromFeed_SkipsEmptyTitle(t *testing.T) {
	// タイトルが空・空白のみのアイテムはスキップされるケース
	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
			return []rss.FeedItem{
				{Title: "", GUID: "guid-empty"},
				{Title: "   ", GUID: "guid-whitespace"},
				{Title: "有効なタイトル", GUID: "guid-valid"},
			}, nil
		},
	}

	repo := &mockEpisodeRepo{
		getByGUIDFunc: func(ctx context.Context, pid uuid.UUID, guid string) (*model.Episode, error) {
			return nil, nil
		},
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, fetcher)
	result, err := uc.FetchFromFeed(context.Background(), uuid.New(), "https://example.com/feed.xml")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.NewCount != 1 {
		t.Errorf("expected 1 new, got %d", result.NewCount)
	}
	if result.SkippedCount != 2 {
		t.Errorf("expected 2 skipped (empty titles), got %d", result.SkippedCount)
	}
}

func TestFetchFromFeed_UniqueViolationSkipped(t *testing.T) {
	// 並行リクエストで UNIQUE 違反が発生するケース → スキップとして扱う
	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
			return []rss.FeedItem{
				{Title: "競合エピソード", GUID: "guid-race"},
			}, nil
		},
	}

	repo := &mockEpisodeRepo{
		getByGUIDFunc: func(ctx context.Context, pid uuid.UUID, guid string) (*model.Episode, error) {
			// チェック時点では未登録
			return nil, nil
		},
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			// INSERT 時に UNIQUE 違反（別リクエストが先に登録）
			return fmt.Errorf("duplicate key value violates unique constraint")
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, fetcher)
	result, err := uc.FetchFromFeed(context.Background(), uuid.New(), "https://example.com/feed.xml")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.NewCount != 0 {
		t.Errorf("expected 0 new, got %d", result.NewCount)
	}
	if result.SkippedCount != 1 {
		t.Errorf("expected 1 skipped, got %d", result.SkippedCount)
	}
}

func TestFetchFromFeed_LimitsTo50Episodes(t *testing.T) {
	// 60件のエピソードがフィードにある場合、最新50件のみ処理されることを確認
	podcastID := uuid.New()
	totalItems := 60

	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
			items := make([]rss.FeedItem, totalItems)
			baseTime := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
			for i := 0; i < totalItems; i++ {
				// i=0 が最も古く、i=59 が最も新しい
				pubDate := baseTime.Add(time.Duration(i) * time.Hour)
				items[i] = rss.FeedItem{
					Title:   fmt.Sprintf("エピソード %d", i+1),
					GUID:    fmt.Sprintf("guid-%03d", i+1),
					PubDate: &pubDate,
				}
			}
			return items, nil
		},
	}

	// 処理されたエピソード数をカウント
	createdCount := 0
	repo := &mockEpisodeRepo{
		getByGUIDFunc: func(ctx context.Context, pid uuid.UUID, guid string) (*model.Episode, error) {
			return nil, nil // 全て未登録
		},
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			createdCount++
			return nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, fetcher)
	result, err := uc.FetchFromFeed(context.Background(), podcastID, "https://example.com/feed.xml")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	// 50件のみ処理されるべき
	if result.NewCount != 50 {
		t.Errorf("expected 50 new episodes (limited), got %d", result.NewCount)
	}
	if createdCount != 50 {
		t.Errorf("expected 50 create calls, got %d", createdCount)
	}
}

func TestFetchFromFeed_SortsByPubDateDescending(t *testing.T) {
	// 公開日がバラバラの順序で返されても、新しい順にソートされることを確認
	podcastID := uuid.New()

	oldDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	midDate := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	newDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
			return []rss.FeedItem{
				{Title: "古い", GUID: "old", PubDate: &oldDate},
				{Title: "新しい", GUID: "new", PubDate: &newDate},
				{Title: "中間", GUID: "mid", PubDate: &midDate},
			}, nil
		},
	}

	// 処理された順序を記録
	var processedGUIDs []string
	repo := &mockEpisodeRepo{
		getByGUIDFunc: func(ctx context.Context, pid uuid.UUID, guid string) (*model.Episode, error) {
			processedGUIDs = append(processedGUIDs, guid)
			return nil, nil
		},
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, fetcher)
	_, err := uc.FetchFromFeed(context.Background(), podcastID, "https://example.com/feed.xml")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// 新しい順に処理されるべき: new → mid → old
	expected := []string{"new", "mid", "old"}
	if len(processedGUIDs) != len(expected) {
		t.Fatalf("expected %d processed items, got %d", len(expected), len(processedGUIDs))
	}
	for i, guid := range processedGUIDs {
		if guid != expected[i] {
			t.Errorf("position %d: expected GUID %q, got %q", i, expected[i], guid)
		}
	}
}

func TestFetchFromFeed_NilPubDatesSortedToEnd(t *testing.T) {
	// PubDate が nil のアイテムはソート時に末尾に回されることを確認
	podcastID := uuid.New()

	newDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	oldDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
			return []rss.FeedItem{
				{Title: "日付なし", GUID: "no-date", PubDate: nil},
				{Title: "新しい", GUID: "new", PubDate: &newDate},
				{Title: "古い", GUID: "old", PubDate: &oldDate},
			}, nil
		},
	}

	var processedGUIDs []string
	repo := &mockEpisodeRepo{
		getByGUIDFunc: func(ctx context.Context, pid uuid.UUID, guid string) (*model.Episode, error) {
			processedGUIDs = append(processedGUIDs, guid)
			return nil, nil
		},
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, fetcher)
	_, err := uc.FetchFromFeed(context.Background(), podcastID, "https://example.com/feed.xml")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// 日付あり（新しい順）→ 日付なし の順で処理されるべき
	expected := []string{"new", "old", "no-date"}
	if len(processedGUIDs) != len(expected) {
		t.Fatalf("expected %d processed items, got %d", len(expected), len(processedGUIDs))
	}
	for i, guid := range processedGUIDs {
		if guid != expected[i] {
			t.Errorf("position %d: expected GUID %q, got %q", i, expected[i], guid)
		}
	}
}

// ── GetByPodcastIDWithStats テスト ──

func TestGetByPodcastIDWithStats_Success(t *testing.T) {
	podcastID := uuid.New()
	ep1ID := uuid.New()
	ep2ID := uuid.New()
	now := time.Now()

	repo := &mockEpisodeRepo{
		getByPodcastIDWithStatsFunc: func(ctx context.Context, pid uuid.UUID, limit, offset int) ([]repository.EpisodeWithStatsRow, int, error) {
			return []repository.EpisodeWithStatsRow{
				{
					ID:            ep1ID,
					Title:         "エピソード1",
					PublishedAt:   &now,
					AverageRating: 4.333,
					TotalReviews:  3,
				},
				{
					ID:            ep2ID,
					Title:         "エピソード2",
					AverageRating: 0,
					TotalReviews:  0,
				},
			}, 2, nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)
	result, err := uc.GetByPodcastIDWithStats(context.Background(), podcastID, 20, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Total != 2 {
		t.Errorf("expected total 2, got %d", result.Total)
	}
	if len(result.Episodes) != 2 {
		t.Fatalf("expected 2 episodes, got %d", len(result.Episodes))
	}
	// 平均評価が小数点第1位に丸められていること
	if math.Abs(result.Episodes[0].AverageRating-4.3) > 0.001 {
		t.Errorf("expected average_rating 4.3, got %f", result.Episodes[0].AverageRating)
	}
	if result.Episodes[0].TotalReviews != 3 {
		t.Errorf("expected total_reviews 3, got %d", result.Episodes[0].TotalReviews)
	}
	// published_at が nil のエピソードでもエラーにならないこと
	if result.Episodes[1].PublishedAt != nil {
		t.Errorf("expected nil published_at for ep2, got %v", result.Episodes[1].PublishedAt)
	}
}

func TestGetByPodcastIDWithStats_Empty(t *testing.T) {
	repo := &mockEpisodeRepo{
		getByPodcastIDWithStatsFunc: func(ctx context.Context, pid uuid.UUID, limit, offset int) ([]repository.EpisodeWithStatsRow, int, error) {
			return []repository.EpisodeWithStatsRow{}, 0, nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)
	result, err := uc.GetByPodcastIDWithStats(context.Background(), uuid.New(), 20, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Total != 0 {
		t.Errorf("expected total 0, got %d", result.Total)
	}
	if len(result.Episodes) != 0 {
		t.Errorf("expected 0 episodes, got %d", len(result.Episodes))
	}
}

func TestGetByPodcastIDWithStats_LimitOffset(t *testing.T) {
	// limit が 0 以下の場合にデフォルト値 20 に補正されることを確認
	repo := &mockEpisodeRepo{
		getByPodcastIDWithStatsFunc: func(ctx context.Context, pid uuid.UUID, limit, offset int) ([]repository.EpisodeWithStatsRow, int, error) {
			if limit != 20 {
				t.Errorf("expected limit to be corrected to 20, got %d", limit)
			}
			if offset != 0 {
				t.Errorf("expected offset to be corrected to 0, got %d", offset)
			}
			return []repository.EpisodeWithStatsRow{}, 0, nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)
	_, err := uc.GetByPodcastIDWithStats(context.Background(), uuid.New(), -1, -5)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestGetByPodcastIDWithStats_RepoError(t *testing.T) {
	repo := &mockEpisodeRepo{
		getByPodcastIDWithStatsFunc: func(ctx context.Context, pid uuid.UUID, limit, offset int) ([]repository.EpisodeWithStatsRow, int, error) {
			return nil, 0, fmt.Errorf("database error")
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)
	_, err := uc.GetByPodcastIDWithStats(context.Background(), uuid.New(), 20, 0)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ── GetRecentForUser テスト ──

func TestGetRecentForUser_Success(t *testing.T) {
	userID := uuid.New()
	ep1ID := uuid.New()
	ep2ID := uuid.New()
	podcastID := uuid.New()
	now := time.Date(2026, 3, 25, 12, 0, 0, 0, time.UTC)
	desc := "エピソードの説明"
	dur := int64(3600000)
	artwork := "https://example.com/artwork.jpg"

	repo := &mockEpisodeRepo{
		getRecentByUserIDFunc: func(ctx context.Context, uid uuid.UUID) ([]repository.RecentEpisodeRow, int, error) {
			return []repository.RecentEpisodeRow{
				{
					ID:              ep1ID,
					Title:           "エピソード1",
					Description:     &desc,
					DurationMs:      &dur,
					PublishedAt:     &now,
					PodcastID:       podcastID,
					PodcastTitle:    "テスト番組",
					PodcastArtwork:  &artwork,
					TotalUnlistened: 5,
				},
				{
					ID:              ep2ID,
					Title:           "エピソード2",
					PodcastID:       podcastID,
					PodcastTitle:    "テスト番組",
					PodcastArtwork:  &artwork,
					TotalUnlistened: 5,
				},
			}, 1, nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)
	result, err := uc.GetRecentForUser(context.Background(), userID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.RecordedPodcastCount != 1 {
		t.Errorf("expected recorded_podcast_count 1, got %d", result.RecordedPodcastCount)
	}
	// 1つの番組グループが存在すること
	if len(result.Podcasts) != 1 {
		t.Fatalf("expected 1 podcast group, got %d", len(result.Podcasts))
	}
	group := result.Podcasts[0]
	// podcast 情報のマッピング確認
	if group.Podcast.ID != podcastID {
		t.Errorf("expected podcast ID %s, got %s", podcastID, group.Podcast.ID)
	}
	if group.Podcast.Title != "テスト番組" {
		t.Errorf("expected podcast title 'テスト番組', got %q", group.Podcast.Title)
	}
	if group.Podcast.ArtworkURL == nil || *group.Podcast.ArtworkURL != artwork {
		t.Errorf("expected podcast artwork_url %q, got %v", artwork, group.Podcast.ArtworkURL)
	}
	if group.TotalUnlistened != 5 {
		t.Errorf("expected total_unlistened 5, got %d", group.TotalUnlistened)
	}
	// エピソード数の確認
	if len(group.Episodes) != 2 {
		t.Fatalf("expected 2 episodes in group, got %d", len(group.Episodes))
	}
	// published_at のフォーマット確認
	if group.Episodes[0].PublishedAt == nil {
		t.Fatal("expected published_at to be set for ep1")
	}
	expected := "2026-03-25T12:00:00Z"
	if *group.Episodes[0].PublishedAt != expected {
		t.Errorf("expected published_at %q, got %q", expected, *group.Episodes[0].PublishedAt)
	}
	// published_at が nil のエピソードでは省略されること
	if group.Episodes[1].PublishedAt != nil {
		t.Errorf("expected nil published_at for ep2, got %v", group.Episodes[1].PublishedAt)
	}
}

// TestGetRecentForUser_MultiplePodcasts は複数番組がある場合のグループ化とソートを確認するテストです。
// 番組Bの最新エピソードが番組Aより新しい場合、番組Bが先に表示されることを確認します。
func TestGetRecentForUser_MultiplePodcasts(t *testing.T) {
	podcastAID := uuid.New()
	podcastBID := uuid.New()
	olderTime := time.Date(2026, 3, 20, 12, 0, 0, 0, time.UTC)
	newerTime := time.Date(2026, 3, 25, 12, 0, 0, 0, time.UTC)

	repo := &mockEpisodeRepo{
		getRecentByUserIDFunc: func(ctx context.Context, uid uuid.UUID) ([]repository.RecentEpisodeRow, int, error) {
			return []repository.RecentEpisodeRow{
				{
					ID:              uuid.New(),
					Title:           "番組Aのエピソード",
					PublishedAt:     &olderTime,
					PodcastID:       podcastAID,
					PodcastTitle:    "番組A",
					TotalUnlistened: 1,
				},
				{
					ID:              uuid.New(),
					Title:           "番組Bのエピソード",
					PublishedAt:     &newerTime,
					PodcastID:       podcastBID,
					PodcastTitle:    "番組B",
					TotalUnlistened: 2,
				},
			}, 2, nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)
	result, err := uc.GetRecentForUser(context.Background(), uuid.New())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result.Podcasts) != 2 {
		t.Fatalf("expected 2 podcast groups, got %d", len(result.Podcasts))
	}
	// 番組Bの方が新しいので先に表示される
	if result.Podcasts[0].Podcast.ID != podcastBID {
		t.Errorf("expected podcast B first (newer), got %s", result.Podcasts[0].Podcast.Title)
	}
	if result.Podcasts[1].Podcast.ID != podcastAID {
		t.Errorf("expected podcast A second (older), got %s", result.Podcasts[1].Podcast.Title)
	}
}

func TestGetRecentForUser_Empty(t *testing.T) {
	repo := &mockEpisodeRepo{
		getRecentByUserIDFunc: func(ctx context.Context, uid uuid.UUID) ([]repository.RecentEpisodeRow, int, error) {
			return []repository.RecentEpisodeRow{}, 0, nil
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)
	result, err := uc.GetRecentForUser(context.Background(), uuid.New())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(result.Podcasts) != 0 {
		t.Errorf("expected 0 podcast groups, got %d", len(result.Podcasts))
	}
}

func TestGetRecentForUser_RepoError(t *testing.T) {
	repo := &mockEpisodeRepo{
		getRecentByUserIDFunc: func(ctx context.Context, uid uuid.UUID) ([]repository.RecentEpisodeRow, int, error) {
			return nil, 0, fmt.Errorf("database error")
		},
	}

	uc := NewEpisodeUsecase(repo, &mockPodcastRepoForEpisode{}, nil)
	_, err := uc.GetRecentForUser(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ── GetByPodcastIDWithAutoFetch テスト ──

func TestGetByPodcastIDWithAutoFetch_NoFeedURL(t *testing.T) {
	// feed_url がない番組では FetchFromFeed が呼ばれないことを確認する
	podcastID := uuid.New()
	fetchCalled := false

	episodeRepo := &mockEpisodeRepo{
		getByPodcastIDWithStatsFunc: func(ctx context.Context, pid uuid.UUID, limit, offset int) ([]repository.EpisodeWithStatsRow, int, error) {
			return []repository.EpisodeWithStatsRow{}, 0, nil
		},
	}
	podcastRepo := &mockPodcastRepoForEpisode{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.Podcast, error) {
			return &model.Podcast{ID: podcastID, Title: "テスト番組"}, nil // feed_url なし
		},
	}
	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, feedURL string) ([]rss.FeedItem, error) {
			fetchCalled = true
			return nil, nil
		},
	}

	uc := NewEpisodeUsecase(episodeRepo, podcastRepo, fetcher)
	result, err := uc.GetByPodcastIDWithAutoFetch(context.Background(), podcastID, 20, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Total != 0 {
		t.Errorf("expected 0 total, got %d", result.Total)
	}
	if fetchCalled {
		t.Error("FetchFromFeed should not be called when feed_url is nil")
	}
}

func TestGetByPodcastIDWithAutoFetch_ZeroEpisodes_SyncFetch(t *testing.T) {
	// エピソード 0 件 + feed_url あり → 同期的に FetchFromFeed が呼ばれることを確認する
	podcastID := uuid.New()
	feedURL := "https://example.com/feed.xml"
	fetchCalled := false
	callCount := 0

	episodeRepo := &mockEpisodeRepo{
		getByPodcastIDWithStatsFunc: func(ctx context.Context, pid uuid.UUID, limit, offset int) ([]repository.EpisodeWithStatsRow, int, error) {
			callCount++
			if callCount == 1 {
				// 1回目: エピソード 0 件
				return []repository.EpisodeWithStatsRow{}, 0, nil
			}
			// 2回目: フェッチ後にエピソードが入っている
			return []repository.EpisodeWithStatsRow{
				{ID: uuid.New(), Title: "エピソード1"},
			}, 1, nil
		},
		getByGUIDFunc: func(ctx context.Context, podcastID uuid.UUID, guid string) (*model.Episode, error) {
			return nil, nil // 新規扱い
		},
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}
	podcastRepo := &mockPodcastRepoForEpisode{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.Podcast, error) {
			return &model.Podcast{ID: podcastID, Title: "テスト番組", FeedURL: &feedURL}, nil
		},
	}
	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, url string) ([]rss.FeedItem, error) {
			fetchCalled = true
			return []rss.FeedItem{
				{Title: "エピソード1", GUID: "guid-1"},
			}, nil
		},
	}

	uc := NewEpisodeUsecase(episodeRepo, podcastRepo, fetcher)
	result, err := uc.GetByPodcastIDWithAutoFetch(context.Background(), podcastID, 20, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !fetchCalled {
		t.Error("FetchFromFeed should be called when episodes are 0")
	}
	if result.Total != 1 {
		t.Errorf("expected 1 total after fetch, got %d", result.Total)
	}
	if !podcastRepo.updateFeedLastFetchedAtCalled {
		t.Error("UpdateFeedLastFetchedAt should be called after FetchFromFeed")
	}
}

func TestGetByPodcastIDWithAutoFetch_Fresh_NoRefresh(t *testing.T) {
	// エピソードあり + feed_last_fetched_at が新しい → FetchFromFeed が呼ばれないことを確認する
	podcastID := uuid.New()
	feedURL := "https://example.com/feed.xml"
	recentTime := time.Now() // 今取得したばかり
	fetchCalled := make(chan bool, 1)

	episodeRepo := &mockEpisodeRepo{
		getByPodcastIDWithStatsFunc: func(ctx context.Context, pid uuid.UUID, limit, offset int) ([]repository.EpisodeWithStatsRow, int, error) {
			return []repository.EpisodeWithStatsRow{
				{ID: uuid.New(), Title: "エピソード1"},
			}, 1, nil
		},
	}
	podcastRepo := &mockPodcastRepoForEpisode{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.Podcast, error) {
			return &model.Podcast{
				ID:                podcastID,
				Title:             "テスト番組",
				FeedURL:           &feedURL,
				FeedLastFetchedAt: &recentTime,
			}, nil
		},
	}
	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, url string) ([]rss.FeedItem, error) {
			fetchCalled <- true
			return nil, nil
		},
	}

	uc := NewEpisodeUsecase(episodeRepo, podcastRepo, fetcher)
	result, err := uc.GetByPodcastIDWithAutoFetch(context.Background(), podcastID, 20, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Total != 1 {
		t.Errorf("expected 1 total, got %d", result.Total)
	}

	// チャネルで「一定時間呼ばれないこと」を検証する（time.Sleep よりフレークしにくい）
	select {
	case <-fetchCalled:
		t.Error("FetchFromFeed should not be called when feed is fresh")
	case <-time.After(100 * time.Millisecond):
		// OK: 呼ばれなかった
	}
}

func TestGetByPodcastIDWithAutoFetch_Stale_BackgroundRefresh(t *testing.T) {
	// エピソードあり + feed_last_fetched_at が古い → バックグラウンドで FetchFromFeed が呼ばれることを確認する
	podcastID := uuid.New()
	feedURL := "https://example.com/feed.xml"
	staleTime := time.Now().Add(-7 * time.Hour) // 7時間前（6時間の閾値を超えている）
	fetchCalled := make(chan bool, 1)

	episodeRepo := &mockEpisodeRepo{
		getByPodcastIDWithStatsFunc: func(ctx context.Context, pid uuid.UUID, limit, offset int) ([]repository.EpisodeWithStatsRow, int, error) {
			return []repository.EpisodeWithStatsRow{
				{ID: uuid.New(), Title: "エピソード1"},
			}, 1, nil
		},
		getByGUIDFunc: func(ctx context.Context, podcastID uuid.UUID, guid string) (*model.Episode, error) {
			return nil, nil
		},
		createFunc: func(ctx context.Context, episode *model.Episode) error {
			return nil
		},
	}
	podcastRepo := &mockPodcastRepoForEpisode{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.Podcast, error) {
			return &model.Podcast{
				ID:                podcastID,
				Title:             "テスト番組",
				FeedURL:           &feedURL,
				FeedLastFetchedAt: &staleTime,
			}, nil
		},
	}
	fetcher := &mockRSSFetcher{
		fetchFunc: func(ctx context.Context, url string) ([]rss.FeedItem, error) {
			fetchCalled <- true
			return []rss.FeedItem{}, nil
		},
	}

	uc := NewEpisodeUsecase(episodeRepo, podcastRepo, fetcher)
	result, err := uc.GetByPodcastIDWithAutoFetch(context.Background(), podcastID, 20, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	// レスポンスは即座に返る（既存データ）
	if result.Total != 1 {
		t.Errorf("expected 1 total, got %d", result.Total)
	}

	// バックグラウンドの goroutine が FetchFromFeed を呼ぶのを待つ
	select {
	case <-fetchCalled:
		// OK: バックグラウンドでフェッチが実行された
	case <-time.After(2 * time.Second):
		t.Error("FetchFromFeed should be called in background when feed is stale")
	}
}
