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
	createFn      func(ctx context.Context, podcast *model.Podcast) error
	searchFn      func(ctx context.Context, query string, genres []string, limit, offset int) ([]repository.PodcastSearchRow, int, error)
	getByIDFn     func(ctx context.Context, id uuid.UUID) (*model.Podcast, error)
}

func (m *mockPodcastRepoForSearch) Create(ctx context.Context, podcast *model.Podcast) error {
	if m.createFn != nil {
		return m.createFn(ctx, podcast)
	}
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
func (m *mockPodcastRepoForSearch) Search(ctx context.Context, query string, genres []string, limit, offset int) ([]repository.PodcastSearchRow, int, error) {
	if m.searchFn == nil {
		return nil, 0, fmt.Errorf("not implemented")
	}
	return m.searchFn(ctx, query, genres, limit, offset)
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
func (m *mockPodcastRepoForSearch) UpdateGenre(_ context.Context, _ uuid.UUID, _ string) error {
	return fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForSearch) ListWithoutGenre(_ context.Context) ([]model.Podcast, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForSearch) ListWithoutEpisodes(_ context.Context) ([]model.Podcast, error) {
	return nil, fmt.Errorf("not implemented")
}

// ── テスト: Create ──

func TestPodcastUsecase_Create(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: 番組が手動登録される", func(t *testing.T) {
		author := "テスト著者"
		description := "テスト説明文"
		artworkURL := "https://example.com/artwork.jpg"
		genre := "コメディ"

		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			createFn: func(_ context.Context, podcast *model.Podcast) error {
				if podcast.SourceType != "manual" {
					t.Errorf("source_type = %q, want %q", podcast.SourceType, "manual")
				}
				if podcast.Title != "テスト番組" {
					t.Errorf("title = %q, want %q", podcast.Title, "テスト番組")
				}
				return nil
			},
			getByIDFn: func(_ context.Context, id uuid.UUID) (*model.Podcast, error) {
				return &model.Podcast{
					ID:         id,
					Title:      "テスト番組",
					Author:     &author,
					SourceType: "manual",
				}, nil
			},
		})

		input := CreatePodcastInput{
			Title:       "テスト番組",
			Author:      &author,
			Description: &description,
			ArtworkURL:  &artworkURL,
			Genre:       &genre,
		}

		result, err := uc.Create(ctx, input)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Title != "テスト番組" {
			t.Errorf("title = %q, want %q", result.Title, "テスト番組")
		}
		if result.SourceType != "manual" {
			t.Errorf("source_type = %q, want %q", result.SourceType, "manual")
		}
	})

	t.Run("タイトルが空 → ValidationError", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{})

		_, err := uc.Create(ctx, CreatePodcastInput{Title: ""})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		ve, ok := err.(*ValidationError)
		if !ok {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
		if ve.Message != "title is required" {
			t.Errorf("message = %q, want %q", ve.Message, "title is required")
		}
	})

	t.Run("タイトルが空白のみ → ValidationError", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{})

		_, err := uc.Create(ctx, CreatePodcastInput{Title: "   "})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		_, ok := err.(*ValidationError)
		if !ok {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
	})

	t.Run("DB エラー → エラー伝播", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			createFn: func(_ context.Context, _ *model.Podcast) error {
				return fmt.Errorf("database connection error")
			},
		})

		_, err := uc.Create(ctx, CreatePodcastInput{Title: "テスト番組"})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

// ── テスト: Search ──

func TestPodcastUsecase_Search(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: 検索結果を取得", func(t *testing.T) {
		author := "テスト配信者"
		artworkURL := "https://example.com/artwork.jpg"

		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, q string, _ []string, limit, offset int) ([]repository.PodcastSearchRow, int, error) {
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
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
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

	t.Run("正常系: genre を指定して検索（親カテゴリがサブカテゴリに展開される）", func(t *testing.T) {
		author := "テスト配信者"
		artworkURL := "https://example.com/artwork.jpg"

		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, q string, genres []string, limit, offset int) ([]repository.PodcastSearchRow, int, error) {
				if q != "テスト" {
					t.Errorf("query = %q, want %q", q, "テスト")
				}
				// "Comedy" は ExpandGenre で日本語サブカテゴリに展開されるはず
				if len(genres) < 2 {
					t.Errorf("genres count = %d, want >= 2 (Comedy should expand to sub-genres)", len(genres))
				}
				// 展開後に "コメディ" が含まれているか確認（DB は日本語名）
				found := false
				for _, g := range genres {
					if g == "コメディ" {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("genres does not contain 'コメディ': %v", genres)
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

	t.Run("正常系: genre のみ指定（query 空）でジャンルブラウズ", func(t *testing.T) {
		// query が空（ジャンルブラウズ時）でも正常に動作することを確認。
		// リポジトリ層で ILIKE '%%' を使わず genre のみで検索される。
		author := "テスト配信者"
		artworkURL := "https://example.com/artwork.jpg"

		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, q string, genres []string, limit, offset int) ([]repository.PodcastSearchRow, int, error) {
				// query は空文字であるべき
				if q != "" {
					t.Errorf("query = %q, want empty string", q)
				}
				// genre は展開されているはず
				if len(genres) == 0 {
					t.Error("genres should not be empty when genre is specified")
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
						Title:         "コメディ番組A",
						Author:        &author,
						ArtworkURL:    &artworkURL,
						AverageRating: 4.0,
						TotalReviews:  5,
					},
					{
						ID:            uuid.New(),
						Title:         "コメディ番組B",
						Author:        &author,
						ArtworkURL:    &artworkURL,
						AverageRating: 3.0,
						TotalReviews:  2,
					},
				}, 2, nil
			},
		})

		// query を空にして genre だけ指定
		result, err := uc.Search(ctx, "", "Comedy", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Total != 2 {
			t.Errorf("total = %d, want 2", result.Total)
		}
		if len(result.Podcasts) != 2 {
			t.Fatalf("podcasts count = %d, want 2", len(result.Podcasts))
		}
	})

	t.Run("正常系: query も genre も空 → 全件検索", func(t *testing.T) {
		// 両方空の場合でもエラーにならず全件検索として動作することを確認。
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, q string, genres []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				if q != "" {
					t.Errorf("query = %q, want empty string", q)
				}
				if len(genres) != 0 {
					t.Errorf("genres = %v, want empty", genres)
				}
				return []repository.PodcastSearchRow{}, 0, nil
			},
		})

		result, err := uc.Search(ctx, "", "", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Total != 0 {
			t.Errorf("total = %d, want 0", result.Total)
		}
	})

	t.Run("limit が 0 以下 → デフォルト 20 に補正", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, limit, _ int) ([]repository.PodcastSearchRow, int, error) {
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
			searchFn: func(_ context.Context, _ string, _ []string, limit, _ int) ([]repository.PodcastSearchRow, int, error) {
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
			searchFn: func(_ context.Context, _ string, _ []string, _, offset int) ([]repository.PodcastSearchRow, int, error) {
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
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
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
