package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/external/itunes"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// mockPodcastRepo は PodcastRepository のモック実装です。
// テストで必要なメソッドだけ実装し、残りは not implemented を返します。
type mockPodcastRepo struct {
	listWithoutGenreFn func(ctx context.Context) ([]model.Podcast, error)
	updateGenreFn      func(ctx context.Context, id uuid.UUID, genre string) error
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
func (m *mockPodcastRepo) Search(_ context.Context, _ string, _ string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
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

func (m *mockPodcastRepo) UpdateGenre(ctx context.Context, id uuid.UUID, genre string) error {
	if m.updateGenreFn == nil {
		return fmt.Errorf("not implemented")
	}
	return m.updateGenreFn(ctx, id, genre)
}

func (m *mockPodcastRepo) ListWithoutGenre(ctx context.Context) ([]model.Podcast, error) {
	if m.listWithoutGenreFn == nil {
		return nil, fmt.Errorf("not implemented")
	}
	return m.listWithoutGenreFn(ctx)
}

// TestRun_NoPodcastsToUpdate はジャンル未設定の番組がない場合のテストです。
func TestRun_NoPodcastsToUpdate(t *testing.T) {
	repo := &mockPodcastRepo{
		listWithoutGenreFn: func(_ context.Context) ([]model.Podcast, error) {
			return []model.Podcast{}, nil
		},
	}

	// iTunes API は呼ばれないはずなので、呼ばれたらテスト失敗
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("iTunes API should not be called when no podcasts need updating")
		http.Error(w, "unexpected call", http.StatusInternalServerError)
	}))
	defer server.Close()

	client := itunes.NewClient()
	// baseURL は差し替えない（呼ばれないはずだから）

	err := run(repo, client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// TestRun_UpdatesGenreSuccessfully はジャンルが正常に更新されるケースのテストです。
func TestRun_UpdatesGenreSuccessfully(t *testing.T) {
	podcastID := uuid.New()
	itunesID := int64(12345)

	// UpdateGenre が呼ばれたことを記録する変数
	var updatedID uuid.UUID
	var updatedGenre string

	repo := &mockPodcastRepo{
		listWithoutGenreFn: func(_ context.Context) ([]model.Podcast, error) {
			return []model.Podcast{
				{
					ID:       podcastID,
					ItunesID: &itunesID,
					Title:    "テスト番組",
				},
			}, nil
		},
		updateGenreFn: func(_ context.Context, id uuid.UUID, genre string) error {
			updatedID = id
			updatedGenre = genre
			return nil
		},
	}

	// モック iTunes API サーバー
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := itunes.SearchResponse{
			ResultCount: 1,
			Results: []itunes.SearchResult{
				{
					CollectionID: 12345,
					PrimaryGenre: "Comedy",
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			t.Errorf("failed to encode response: %v", err)
			http.Error(w, "encode error", http.StatusInternalServerError)
			return
		}
	}))
	defer server.Close()

	client := itunes.NewClient()
	client.SetBaseURL(server.URL)

	err := run(repo, client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if updatedID != podcastID {
		t.Errorf("updated podcast ID = %v, want %v", updatedID, podcastID)
	}
	if updatedGenre != "Comedy" {
		t.Errorf("updated genre = %q, want %q", updatedGenre, "Comedy")
	}
}

// TestRun_SkipsWhenItunesReturnsNotFound は iTunes API で見つからない場合のテストです。
func TestRun_SkipsWhenItunesReturnsNotFound(t *testing.T) {
	itunesID := int64(99999)

	repo := &mockPodcastRepo{
		listWithoutGenreFn: func(_ context.Context) ([]model.Podcast, error) {
			return []model.Podcast{
				{
					ID:       uuid.New(),
					ItunesID: &itunesID,
					Title:    "見つからない番組",
				},
			}, nil
		},
		updateGenreFn: func(_ context.Context, _ uuid.UUID, _ string) error {
			t.Fatal("UpdateGenre should not be called when iTunes returns not found")
			return nil
		},
	}

	// iTunes API は resultCount=0 を返す
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := itunes.SearchResponse{
			ResultCount: 0,
			Results:     []itunes.SearchResult{},
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			t.Errorf("failed to encode response: %v", err)
			http.Error(w, "encode error", http.StatusInternalServerError)
			return
		}
	}))
	defer server.Close()

	client := itunes.NewClient()
	client.SetBaseURL(server.URL)

	err := run(repo, client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
