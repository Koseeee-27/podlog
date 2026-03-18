package usecase

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// ── モックリポジトリ（Podcast 検索テスト用） ──

// mockPodcastRepoForSearch は PodcastRepository のモック実装です。
// 検索テスト用に searchFn を差し替えて DB の振る舞いをシミュレートします。
type mockPodcastRepoForSearch struct {
	searchFn      func(ctx context.Context, query string, genre string, limit, offset int) ([]repository.PodcastSearchRow, int, error)
	getByIDFn     func(ctx context.Context, id uuid.UUID) (*model.Podcast, error)
}

func (m *mockPodcastRepoForSearch) Create(_ context.Context, _ *model.Podcast) error {
	return fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForSearch) GetByID(ctx context.Context, id uuid.UUID) (*model.Podcast, error) {
	if m.getByIDFn == nil {
		return nil, fmt.Errorf("not implemented")
	}
	return m.getByIDFn(ctx, id)
}
func (m *mockPodcastRepoForSearch) GetByItunesID(_ context.Context, _ int64) (*model.Podcast, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForSearch) Search(ctx context.Context, query string, genre string, limit, offset int) ([]repository.PodcastSearchRow, int, error) {
	if m.searchFn == nil {
		return nil, 0, fmt.Errorf("not implemented")
	}
	return m.searchFn(ctx, query, genre, limit, offset)
}
func (m *mockPodcastRepoForSearch) GetDistinctGenres(_ context.Context) ([]string, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForSearch) GetPopular(_ context.Context, _ int) ([]repository.PodcastSearchRow, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForSearch) ExistsByIDs(_ context.Context, _ []uuid.UUID) ([]uuid.UUID, error) {
	return nil, fmt.Errorf("not implemented")
}

// ── テスト: Search ──

func TestPodcastUsecase_Search(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: 検索結果を取得", func(t *testing.T) {
		author := "テスト配信者"
		artworkURL := "https://example.com/artwork.jpg"

		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, q string, _ string, limit, offset int) ([]repository.PodcastSearchRow, int, error) {
				if q != "テスト" {
					t.Errorf("query = %q, want %q", q, "テスト")
				}
				if limit != 20 {
					t.Errorf("limit = %d, want 20", limit)
				}
				if offset != 0 {
					t.Errorf("offset = %d, want 0", offset)
				}
				return []repository.PodcastSearchRow{
					{
						ID:            uuid.New(),
						Title:         "テスト番組",
						Author:        &author,
						ArtworkURL:    &artworkURL,
						AverageRating: 4.25,
						TotalReviews:  12,
					},
				}, 1, nil
			},
		})

		result, err := uc.Search(ctx, "テスト", "", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Total != 1 {
			t.Errorf("total = %d, want 1", result.Total)
		}
		if len(result.Podcasts) != 1 {
			t.Fatalf("podcasts count = %d, want 1", len(result.Podcasts))
		}
		p := result.Podcasts[0]
		if p.Title != "テスト番組" {
			t.Errorf("title = %q, want %q", p.Title, "テスト番組")
		}
		if p.Author == nil || *p.Author != "テスト配信者" {
			t.Errorf("author = %v, want %q", p.Author, "テスト配信者")
		}
		// 平均評価は小数点第1位に丸められること（4.25 → 4.3）
		if p.AverageRating != 4.3 {
			t.Errorf("average_rating = %f, want 4.3", p.AverageRating)
		}
		if p.TotalReviews != 12 {
			t.Errorf("total_reviews = %d, want 12", p.TotalReviews)
		}
	})

	t.Run("正常系: 検索結果が空の場合は空配列を返す", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return []repository.PodcastSearchRow{}, 0, nil
			},
		})

		result, err := uc.Search(ctx, "存在しない番組", "", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Total != 0 {
			t.Errorf("total = %d, want 0", result.Total)
		}
		if len(result.Podcasts) != 0 {
			t.Errorf("podcasts count = %d, want 0", len(result.Podcasts))
		}
	})

	t.Run("正常系: genre を指定して検索", func(t *testing.T) {
		author := "テスト配信者"
		artworkURL := "https://example.com/artwork.jpg"

		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, q string, genre string, limit, offset int) ([]repository.PodcastSearchRow, int, error) {
				if q != "テスト" {
					t.Errorf("query = %q, want %q", q, "テスト")
				}
				if genre != "Comedy" {
					t.Errorf("genre = %q, want %q", genre, "Comedy")
				}
				if limit != 20 {
					t.Errorf("limit = %d, want 20", limit)
				}
				if offset != 0 {
					t.Errorf("offset = %d, want 0", offset)
				}
				return []repository.PodcastSearchRow{
					{
						ID:            uuid.New(),
						Title:         "コメディ番組",
						Author:        &author,
						ArtworkURL:    &artworkURL,
						AverageRating: 3.5,
						TotalReviews:  8,
					},
				}, 1, nil
			},
		})

		result, err := uc.Search(ctx, "テスト", "Comedy", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Total != 1 {
			t.Errorf("total = %d, want 1", result.Total)
		}
		if len(result.Podcasts) != 1 {
			t.Fatalf("podcasts count = %d, want 1", len(result.Podcasts))
		}
		p := result.Podcasts[0]
		if p.Title != "コメディ番組" {
			t.Errorf("title = %q, want %q", p.Title, "コメディ番組")
		}
		if p.AverageRating != 3.5 {
			t.Errorf("average_rating = %f, want 3.5", p.AverageRating)
		}
	})

	t.Run("limit が 0 以下 → デフォルト 20 に補正", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ string, limit, _ int) ([]repository.PodcastSearchRow, int, error) {
				if limit != 20 {
					t.Errorf("limit = %d, want 20 (default)", limit)
				}
				return nil, 0, nil
			},
		})

		_, err := uc.Search(ctx, "テスト", "", 0, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("limit が 50 超 → デフォルト 20 に補正", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ string, limit, _ int) ([]repository.PodcastSearchRow, int, error) {
				if limit != 20 {
					t.Errorf("limit = %d, want 20 (default)", limit)
				}
				return nil, 0, nil
			},
		})

		_, err := uc.Search(ctx, "テスト", "", 100, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("offset が負 → 0 に補正", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ string, _, offset int) ([]repository.PodcastSearchRow, int, error) {
				if offset != 0 {
					t.Errorf("offset = %d, want 0", offset)
				}
				return nil, 0, nil
			},
		})

		_, err := uc.Search(ctx, "テスト", "", 20, -5)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("DB エラー → エラー伝播", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return nil, 0, fmt.Errorf("database connection error")
			},
		})

		_, err := uc.Search(ctx, "テスト", "", 20, 0)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

// ── テスト: GetByID ──

func TestPodcastUsecase_GetByID(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: ポッドキャスト取得成功", func(t *testing.T) {
		podcastID := uuid.New()
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			getByIDFn: func(_ context.Context, id uuid.UUID) (*model.Podcast, error) {
				if id != podcastID {
					t.Errorf("id = %v, want %v", id, podcastID)
				}
				return &model.Podcast{
					ID:    podcastID,
					Title: "テスト番組",
				}, nil
			},
		})

		result, err := uc.GetByID(ctx, podcastID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Title != "テスト番組" {
			t.Errorf("title = %q, want %q", result.Title, "テスト番組")
		}
	})

	t.Run("存在しないポッドキャスト → NotFoundError", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Podcast, error) {
				return nil, nil
			},
		})

		_, err := uc.GetByID(ctx, uuid.New())
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		nfe, ok := err.(*NotFoundError)
		if !ok {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
		if nfe.Resource != "podcast" {
			t.Errorf("resource = %q, want %q", nfe.Resource, "podcast")
		}
	})

	t.Run("DB エラー → エラー伝播", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Podcast, error) {
				return nil, fmt.Errorf("database error")
			},
		})

		_, err := uc.GetByID(ctx, uuid.New())
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}
