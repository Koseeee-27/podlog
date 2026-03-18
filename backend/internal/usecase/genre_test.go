package usecase

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// ── モックリポジトリ（ジャンルテスト用） ──

// mockPodcastRepoForGenre は PodcastRepository のモック実装です。
// GetDistinctGenres の振る舞いを差し替えるために使います。
type mockPodcastRepoForGenre struct {
	getDistinctGenresFn func(ctx context.Context) ([]string, error)
}

func (m *mockPodcastRepoForGenre) Create(_ context.Context, _ *model.Podcast) error {
	return fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForGenre) GetByID(_ context.Context, _ uuid.UUID) (*model.Podcast, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForGenre) GetByItunesID(_ context.Context, _ int64) (*model.Podcast, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForGenre) Search(_ context.Context, _ string, _ string, _ int, _ int) ([]repository.PodcastSearchRow, int, error) {
	return nil, 0, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForGenre) GetPopular(_ context.Context, _ int) ([]repository.PodcastSearchRow, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForGenre) GetDistinctGenres(ctx context.Context) ([]string, error) {
	if m.getDistinctGenresFn == nil {
		return nil, fmt.Errorf("not implemented")
	}
	return m.getDistinctGenresFn(ctx)
}
func (m *mockPodcastRepoForGenre) ExistsByIDs(_ context.Context, _ []uuid.UUID) ([]uuid.UUID, error) {
	return nil, fmt.Errorf("not implemented")
}

// ── テスト: ListGenres ──

func TestGenreUsecase_ListGenres(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: 既知のジャンルは日本語名に変換される", func(t *testing.T) {
		uc := NewGenreUsecase(&mockPodcastRepoForGenre{
			getDistinctGenresFn: func(_ context.Context) ([]string, error) {
				return []string{"Comedy", "News", "Sports"}, nil
			},
		})

		result, err := uc.ListGenres(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Genres) != 3 {
			t.Fatalf("genres count = %d, want 3", len(result.Genres))
		}

		// Comedy → コメディ
		g := result.Genres[0]
		if g.ID != "Comedy" {
			t.Errorf("id = %q, want %q", g.ID, "Comedy")
		}
		if g.NameEN != "Comedy" {
			t.Errorf("name_en = %q, want %q", g.NameEN, "Comedy")
		}
		if g.NameJA != "コメディ" {
			t.Errorf("name_ja = %q, want %q", g.NameJA, "コメディ")
		}

		// News → ニュース
		if result.Genres[1].NameJA != "ニュース" {
			t.Errorf("name_ja = %q, want %q", result.Genres[1].NameJA, "ニュース")
		}

		// Sports → スポーツ
		if result.Genres[2].NameJA != "スポーツ" {
			t.Errorf("name_ja = %q, want %q", result.Genres[2].NameJA, "スポーツ")
		}
	})

	t.Run("正常系: 未知のジャンルは英語名のままフォールバック", func(t *testing.T) {
		uc := NewGenreUsecase(&mockPodcastRepoForGenre{
			getDistinctGenresFn: func(_ context.Context) ([]string, error) {
				return []string{"UnknownGenre"}, nil
			},
		})

		result, err := uc.ListGenres(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Genres) != 1 {
			t.Fatalf("genres count = %d, want 1", len(result.Genres))
		}

		g := result.Genres[0]
		if g.ID != "UnknownGenre" {
			t.Errorf("id = %q, want %q", g.ID, "UnknownGenre")
		}
		// 未知のジャンルは name_ja も英語名と同じ
		if g.NameJA != "UnknownGenre" {
			t.Errorf("name_ja = %q, want %q (fallback to English)", g.NameJA, "UnknownGenre")
		}
	})

	t.Run("正常系: ジャンルが0件の場合は空配列", func(t *testing.T) {
		uc := NewGenreUsecase(&mockPodcastRepoForGenre{
			getDistinctGenresFn: func(_ context.Context) ([]string, error) {
				return []string{}, nil
			},
		})

		result, err := uc.ListGenres(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Genres) != 0 {
			t.Errorf("genres count = %d, want 0", len(result.Genres))
		}
	})

	t.Run("DB エラー → エラー伝播", func(t *testing.T) {
		uc := NewGenreUsecase(&mockPodcastRepoForGenre{
			getDistinctGenresFn: func(_ context.Context) ([]string, error) {
				return nil, fmt.Errorf("database connection error")
			},
		})

		_, err := uc.ListGenres(ctx)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}
