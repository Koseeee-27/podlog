package main

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
)

// ── モック: PodcastRepository ──

// mockPodcastRepo は PodcastRepository のモック実装です。
// テストで必要なメソッドだけ関数フィールドで差し替え、残りは not implemented を返します。
type mockPodcastRepo struct {
	listWithoutEpisodesFn func(ctx context.Context) ([]model.Podcast, error)
}

func (m *mockPodcastRepo) Create(_ context.Context, _ *model.Podcast) error {
	return fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) GetByID(_ context.Context, _ uuid.UUID) (*model.Podcast, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) GetByItunesID(_ context.Context, _ int64) (*model.Podcast, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) Search(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
	return nil, 0, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) GetPopular(_ context.Context, _ int) ([]repository.PodcastSearchRow, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) ExistsByIDs(_ context.Context, _ []uuid.UUID) ([]uuid.UUID, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) GetDistinctGenres(_ context.Context) ([]string, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) UpdateGenre(_ context.Context, _ uuid.UUID, _ string) error {
	return fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) ListWithoutGenre(_ context.Context) ([]model.Podcast, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) ListWithoutEpisodes(ctx context.Context) ([]model.Podcast, error) {
	if m.listWithoutEpisodesFn == nil {
		return nil, fmt.Errorf("not implemented")
	}
	return m.listWithoutEpisodesFn(ctx)
}
func (m *mockPodcastRepo) UpdateFeedLastFetchedAt(_ context.Context, _ uuid.UUID) error {
	return nil
}

// ── モック: EpisodeUsecase ──

// mockEpisodeUC は EpisodeUsecase のモック実装です。
// FetchFromFeed だけを差し替えでき、他のメソッドは not implemented を返します。
type mockEpisodeUC struct {
	fetchFromFeedFn func(ctx context.Context, podcastID uuid.UUID, feedURL string) (*usecase.FetchFromFeedResult, error)
}

func (m *mockEpisodeUC) Create(_ context.Context, _ uuid.UUID, _ usecase.CreateEpisodeInput) (*usecase.CreateEpisodeResult, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockEpisodeUC) GetByID(_ context.Context, _ uuid.UUID) (*model.Episode, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockEpisodeUC) GetByPodcastID(_ context.Context, _ uuid.UUID, _, _ int) ([]model.Episode, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockEpisodeUC) GetByPodcastIDWithStats(_ context.Context, _ uuid.UUID, _, _ int) (*usecase.EpisodeListResult, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockEpisodeUC) FetchFromFeed(ctx context.Context, podcastID uuid.UUID, feedURL string) (*usecase.FetchFromFeedResult, error) {
	if m.fetchFromFeedFn == nil {
		return nil, fmt.Errorf("not implemented")
	}
	return m.fetchFromFeedFn(ctx, podcastID, feedURL)
}
func (m *mockEpisodeUC) GetByPodcastIDWithAutoFetch(_ context.Context, _ uuid.UUID, _, _ int) (*usecase.EpisodeListResult, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockEpisodeUC) GetRecentForUser(_ context.Context, _ uuid.UUID) (*usecase.RecentEpisodeListResult, error) {
	return nil, fmt.Errorf("not implemented")
}

// ── テストケース ──

// TestRun_NoPodcastsToProcess はエピソード未取得の番組がない場合のテストです。
// FetchFromFeed が呼ばれないことを確認します。
func TestRun_NoPodcastsToProcess(t *testing.T) {
	repo := &mockPodcastRepo{
		listWithoutEpisodesFn: func(_ context.Context) ([]model.Podcast, error) {
			return []model.Podcast{}, nil
		},
	}

	uc := &mockEpisodeUC{
		fetchFromFeedFn: func(_ context.Context, _ uuid.UUID, _ string) (*usecase.FetchFromFeedResult, error) {
			t.Fatal("FetchFromFeed should not be called when no podcasts need processing")
			return nil, nil
		},
	}

	err := run(repo, uc)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// TestRun_FetchesEpisodesSuccessfully はエピソードが正常に取得されるケースのテストです。
// FetchFromFeed が正しい podcast ID と feed URL で呼ばれることを確認します。
func TestRun_FetchesEpisodesSuccessfully(t *testing.T) {
	podcastID := uuid.New()
	feedURL := "https://example.com/feed.xml"

	// FetchFromFeed が呼ばれたことを記録する変数
	var calledPodcastID uuid.UUID
	var calledFeedURL string

	repo := &mockPodcastRepo{
		listWithoutEpisodesFn: func(_ context.Context) ([]model.Podcast, error) {
			return []model.Podcast{
				{
					ID:      podcastID,
					Title:   "テスト番組",
					FeedURL: &feedURL,
				},
			}, nil
		},
	}

	uc := &mockEpisodeUC{
		fetchFromFeedFn: func(_ context.Context, pid uuid.UUID, furl string) (*usecase.FetchFromFeedResult, error) {
			calledPodcastID = pid
			calledFeedURL = furl
			return &usecase.FetchFromFeedResult{
				NewCount:     10,
				SkippedCount: 0,
				FailedCount:  0,
			}, nil
		},
	}

	err := run(repo, uc)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if calledPodcastID != podcastID {
		t.Errorf("FetchFromFeed called with podcast ID = %v, want %v", calledPodcastID, podcastID)
	}
	if calledFeedURL != feedURL {
		t.Errorf("FetchFromFeed called with feed URL = %q, want %q", calledFeedURL, feedURL)
	}
}

// TestRun_SkipsOnFetchError は FetchFromFeed がエラーを返した場合にスキップして続行するテストです。
// 1件目がエラーでも2件目は正常に処理されることを確認します。
func TestRun_SkipsOnFetchError(t *testing.T) {
	podcast1ID := uuid.New()
	podcast2ID := uuid.New()
	feedURL1 := "https://example.com/feed1.xml"
	feedURL2 := "https://example.com/feed2.xml"

	// 呼ばれた回数を記録
	callCount := 0

	repo := &mockPodcastRepo{
		listWithoutEpisodesFn: func(_ context.Context) ([]model.Podcast, error) {
			return []model.Podcast{
				{ID: podcast1ID, Title: "失敗する番組", FeedURL: &feedURL1},
				{ID: podcast2ID, Title: "成功する番組", FeedURL: &feedURL2},
			}, nil
		},
	}

	uc := &mockEpisodeUC{
		fetchFromFeedFn: func(_ context.Context, pid uuid.UUID, _ string) (*usecase.FetchFromFeedResult, error) {
			callCount++
			if pid == podcast1ID {
				// 1件目はエラー
				return nil, fmt.Errorf("RSS fetch failed")
			}
			// 2件目は成功
			return &usecase.FetchFromFeedResult{
				NewCount:     5,
				SkippedCount: 0,
				FailedCount:  0,
			}, nil
		},
	}

	err := run(repo, uc)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// 2回呼ばれていること（1件目のエラーで全体が止まっていない）
	if callCount != 2 {
		t.Errorf("FetchFromFeed call count = %d, want 2", callCount)
	}
}

// TestRun_SkipsNilFeedURL は feed_url が nil の番組をスキップするテストです。
func TestRun_SkipsNilFeedURL(t *testing.T) {
	repo := &mockPodcastRepo{
		listWithoutEpisodesFn: func(_ context.Context) ([]model.Podcast, error) {
			return []model.Podcast{
				{
					ID:      uuid.New(),
					Title:   "feed_url なし番組",
					FeedURL: nil,
				},
			}, nil
		},
	}

	uc := &mockEpisodeUC{
		fetchFromFeedFn: func(_ context.Context, _ uuid.UUID, _ string) (*usecase.FetchFromFeedResult, error) {
			t.Fatal("FetchFromFeed should not be called for podcasts without feed_url")
			return nil, nil
		},
	}

	err := run(repo, uc)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// TestRun_SkipsEmptyFeedURL は feed_url が空文字の番組をスキップするテストです。
func TestRun_SkipsEmptyFeedURL(t *testing.T) {
	emptyURL := ""
	repo := &mockPodcastRepo{
		listWithoutEpisodesFn: func(_ context.Context) ([]model.Podcast, error) {
			return []model.Podcast{
				{
					ID:      uuid.New(),
					Title:   "feed_url 空文字番組",
					FeedURL: &emptyURL,
				},
			}, nil
		},
	}

	uc := &mockEpisodeUC{
		fetchFromFeedFn: func(_ context.Context, _ uuid.UUID, _ string) (*usecase.FetchFromFeedResult, error) {
			t.Error("FetchFromFeed should not be called for podcasts with empty feed_url")
			return nil, nil
		},
	}

	err := run(repo, uc)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
