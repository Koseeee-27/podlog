package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/external/itunes"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// ── モックリポジトリ（Podcast 検索テスト用） ──

// mockPodcastRepoForSearch は PodcastRepository のモック実装です。
// 検索テスト用に searchFn を差し替えて DB の振る舞いをシミュレートします。
//
// getByIDsWithStatsCallCount は GetByIDsWithStats が呼ばれた回数を記録します。
// iTunes フォールバック経路で N+1 を起こさず、複数の既存番組があっても
// 1 回のクエリで集計値を取得することを検証するために使います。
type mockPodcastRepoForSearch struct {
	createFn                   func(ctx context.Context, podcast *model.Podcast) error
	searchFn                   func(ctx context.Context, query string, genres []string, limit, offset int) ([]repository.PodcastSearchRow, int, error)
	getByIDFn                  func(ctx context.Context, id uuid.UUID) (*model.Podcast, error)
	getByItunesIDFn            func(ctx context.Context, itunesID int64) (*model.Podcast, error)
	getByIDsWithStatsFn        func(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]repository.PodcastSearchRow, error)
	getByIDsWithStatsCallCount int
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
func (m *mockPodcastRepoForSearch) GetByItunesID(ctx context.Context, itunesID int64) (*model.Podcast, error) {
	if m.getByItunesIDFn != nil {
		return m.getByItunesIDFn(ctx, itunesID)
	}
	// デフォルト: 見つからない（フォールバック時に新規番組と判定される）
	return nil, nil
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
func (m *mockPodcastRepoForSearch) GetByIDsWithStats(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]repository.PodcastSearchRow, error) {
	m.getByIDsWithStatsCallCount++
	if m.getByIDsWithStatsFn == nil {
		// 想定外呼び出しを静かに通さないようエラー返却にします。
		// mockPodcastRepoForSearch の他メソッド（Create, Search, GetPopular 等）と
		// 同じ "not implemented" 返却パターンに揃えています。
		// 呼び出し回数カウンタは事前にインクリメント済みのため、回数 assert は引き続き機能します。
		return nil, fmt.Errorf("mockPodcastRepoForSearch.GetByIDsWithStats: not implemented")
	}
	return m.getByIDsWithStatsFn(ctx, ids)
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
func (m *mockPodcastRepoForSearch) UpdateFeedLastFetchedAt(_ context.Context, _ uuid.UUID) error {
	return nil
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
		}, nil)

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
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{}, nil)

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
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{}, nil)

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
		}, nil)

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
						TotalRatings:  12,
						FavoriteCount: 5,
					},
				}, 1, nil
			},
		}, nil)

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
		if p.TotalRatings != 12 {
			t.Errorf("total_ratings = %d, want 12", p.TotalRatings)
		}
		if p.FavoriteCount != 5 {
			t.Errorf("favorite_count = %d, want 5", p.FavoriteCount)
		}
	})

	t.Run("正常系: 検索結果が空の場合は空配列を返す", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return []repository.PodcastSearchRow{}, 0, nil
			},
		}, nil)

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
						TotalRatings:  8,
					},
				}, 1, nil
			},
		}, nil)

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
						TotalRatings:  5,
					},
					{
						ID:            uuid.New(),
						Title:         "コメディ番組B",
						Author:        &author,
						ArtworkURL:    &artworkURL,
						AverageRating: 3.0,
						TotalRatings:  2,
					},
				}, 2, nil
			},
		}, nil)

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
		}, nil)

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
		}, nil)

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
		}, nil)

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
		}, nil)

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
		}, nil)

		_, err := uc.Search(ctx, "テスト", "", 20, 0)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

// ── テスト: Search iTunes フォールバック ──

func TestPodcastUsecase_Search_ITunesFallback(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: DB結果が少ない場合にiTunesからフォールバック取得", func(t *testing.T) {
		// httptest サーバーでiTunes APIをモック
		server := newTestItunesServer(t, itunes.SearchResponse{
			ResultCount: 2,
			Results: []itunes.SearchResult{
				{
					CollectionID:   12345,
					CollectionName: "iTunes番組A",
					ArtistName:     "配信者A",
					ArtworkURL600:  "https://example.com/a.jpg",
					FeedURL:        "https://example.com/feed-a.xml",
					PrimaryGenre:   "Comedy",
				},
				{
					CollectionID:   67890,
					CollectionName: "iTunes番組B",
					ArtistName:     "配信者B",
					ArtworkURL600:  "https://example.com/b.jpg",
					FeedURL:        "https://example.com/feed-b.xml",
					PrimaryGenre:   "News",
				},
			},
		})
		defer server.Close()

		// iTunes クライアントをモックサーバーに接続
		itunesClient := itunes.NewClient()
		itunesClient.SetBaseURL(server.URL)

		// DB には1件だけヒットする
		dbAuthor := "DB配信者"
		dbArtwork := "https://example.com/db.jpg"
		var createdPodcasts []*model.Podcast

		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return []repository.PodcastSearchRow{
					{
						ID:            uuid.New(),
						Title:         "DB番組",
						Author:        &dbAuthor,
						ArtworkURL:    &dbArtwork,
						AverageRating: 4.0,
						TotalRatings:  10,
						FavoriteCount: 3,
					},
				}, 1, nil
			},
			// GetByItunesID: DB に存在しない → nil を返す（デフォルト動作）
			createFn: func(_ context.Context, podcast *model.Podcast) error {
				createdPodcasts = append(createdPodcasts, podcast)
				return nil
			},
		}, itunesClient)

		result, err := uc.Search(ctx, "テスト", "", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// DB の1件 + iTunes の2件 = 3件
		if result.Total != 3 {
			t.Errorf("total = %d, want 3", result.Total)
		}
		if len(result.Podcasts) != 3 {
			t.Fatalf("podcasts count = %d, want 3", len(result.Podcasts))
		}

		// 最初の1件は DB 検索結果
		if result.Podcasts[0].Title != "DB番組" {
			t.Errorf("podcasts[0].title = %q, want %q", result.Podcasts[0].Title, "DB番組")
		}
		// 2件目以降は iTunes から取得した新規番組
		if result.Podcasts[1].Title != "iTunes番組A" {
			t.Errorf("podcasts[1].title = %q, want %q", result.Podcasts[1].Title, "iTunes番組A")
		}
		if result.Podcasts[2].Title != "iTunes番組B" {
			t.Errorf("podcasts[2].title = %q, want %q", result.Podcasts[2].Title, "iTunes番組B")
		}
		// 新規番組のレビュー関連は0
		if result.Podcasts[1].AverageRating != 0 {
			t.Errorf("podcasts[1].average_rating = %f, want 0", result.Podcasts[1].AverageRating)
		}

		// DB に2件保存されたことを確認
		if len(createdPodcasts) != 2 {
			t.Fatalf("created podcasts count = %d, want 2", len(createdPodcasts))
		}
		if createdPodcasts[0].SourceType != "itunes" {
			t.Errorf("source_type = %q, want %q", createdPodcasts[0].SourceType, "itunes")
		}
	})

	t.Run("DB結果が4件以上ならフォールバックしない", func(t *testing.T) {
		// iTunes クライアントを渡しているが、DB結果が4件なのでフォールバックは発動しない
		itunesClient := itunes.NewClient()

		author := "配信者"
		artwork := "https://example.com/art.jpg"
		rows := make([]repository.PodcastSearchRow, 4)
		for i := range rows {
			rows[i] = repository.PodcastSearchRow{
				ID:         uuid.New(),
				Title:      fmt.Sprintf("番組%d", i+1),
				Author:     &author,
				ArtworkURL: &artwork,
			}
		}

		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return rows, 4, nil
			},
		}, itunesClient)

		result, err := uc.Search(ctx, "テスト", "", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// フォールバックなしなので DB の4件のみ
		if result.Total != 4 {
			t.Errorf("total = %d, want 4", result.Total)
		}
	})

	t.Run("offset が 0 でない場合はフォールバックしない", func(t *testing.T) {
		itunesClient := itunes.NewClient()

		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return []repository.PodcastSearchRow{}, 0, nil
			},
		}, itunesClient)

		// offset=10 なので2ページ目 → フォールバックしない
		result, err := uc.Search(ctx, "テスト", "", 20, 10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Total != 0 {
			t.Errorf("total = %d, want 0 (no fallback on non-first page)", result.Total)
		}
	})

	t.Run("query が空（ジャンルブラウズ）の場合はフォールバックしない", func(t *testing.T) {
		itunesClient := itunes.NewClient()

		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return []repository.PodcastSearchRow{}, 0, nil
			},
		}, itunesClient)

		// query が空なのでフォールバック条件を満たさない
		result, err := uc.Search(ctx, "", "Comedy", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Total != 0 {
			t.Errorf("total = %d, want 0 (no fallback without keyword)", result.Total)
		}
	})

	t.Run("iTunes結果がDBに既存でDB検索にヒット済みならスキップ", func(t *testing.T) {
		server := newTestItunesServer(t, itunes.SearchResponse{
			ResultCount: 1,
			Results: []itunes.SearchResult{
				{
					CollectionID:   99999,
					CollectionName: "既存番組",
					ArtistName:     "配信者",
				},
			},
		})
		defer server.Close()

		itunesClient := itunes.NewClient()
		itunesClient.SetBaseURL(server.URL)

		existingID := uuid.New()

		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				// DB 検索で既にヒットしている
				return []repository.PodcastSearchRow{
					{ID: existingID, Title: "既存番組"},
				}, 1, nil
			},
			getByItunesIDFn: func(_ context.Context, itunesID int64) (*model.Podcast, error) {
				if itunesID == 99999 {
					return &model.Podcast{ID: existingID, Title: "既存番組"}, nil
				}
				return nil, nil
			},
		}, itunesClient)

		result, err := uc.Search(ctx, "テスト", "", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// DB 検索結果の1件のみ（重複追加されない）
		if len(result.Podcasts) != 1 {
			t.Errorf("podcasts count = %d, want 1", len(result.Podcasts))
		}
	})

	t.Run("iTunes結果がDBに既存だがDB検索にヒットしていない場合は集計値込みで結果に追加", func(t *testing.T) {
		// podlog#351: 旧実装では既存番組を結果に追加する際に集計値がセットされず、
		// レビューやお気に入りが付いていても average_rating=0, total_ratings=0,
		// favorite_count=0 で返ってしまうバグがあった。修正後は GetByIDsWithStats で
		// DB の実値を取得して埋めることを検証する。
		server := newTestItunesServer(t, itunes.SearchResponse{
			ResultCount: 1,
			Results: []itunes.SearchResult{
				{
					CollectionID:   99999,
					CollectionName: "既存番組",
					ArtistName:     "配信者",
				},
			},
		})
		defer server.Close()

		itunesClient := itunes.NewClient()
		itunesClient.SetBaseURL(server.URL)

		existingID := uuid.New()
		author := "配信者"

		repo := &mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				// DB キーワード検索では0件（タイトルが一致しない）
				return []repository.PodcastSearchRow{}, 0, nil
			},
			getByItunesIDFn: func(_ context.Context, itunesID int64) (*model.Podcast, error) {
				if itunesID == 99999 {
					return &model.Podcast{ID: existingID, Title: "既存番組", Author: &author}, nil
				}
				return nil, nil
			},
			getByIDsWithStatsFn: func(_ context.Context, ids []uuid.UUID) (map[uuid.UUID]repository.PodcastSearchRow, error) {
				// 既存番組の DB 集計値を返す
				row := repository.PodcastSearchRow{
					ID:            existingID,
					Title:         "既存番組",
					Author:        &author,
					AverageRating: 4.25, // roundToOneDecimal で 4.3 になる想定
					TotalRatings:  12,
					FavoriteCount: 5,
				}
				return map[uuid.UUID]repository.PodcastSearchRow{existingID: row}, nil
			},
		}
		uc := NewPodcastUsecase(repo, itunesClient)

		result, err := uc.Search(ctx, "テスト", "", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// DB 検索ではヒットしなかったが、iTunes 経由で既存番組が結果に追加される
		if len(result.Podcasts) != 1 {
			t.Fatalf("podcasts count = %d, want 1", len(result.Podcasts))
		}
		got := result.Podcasts[0]
		if got.ID != existingID {
			t.Errorf("podcast ID = %v, want %v", got.ID, existingID)
		}
		// podlog#351 の検証ポイント: 集計値が DB の実値で埋まっていること。
		// roundToOneDecimal を通した結果との比較は浮動小数の表現誤差で
		// 不安定になりうるため、許容誤差で比較します（rating_test.go と同様）。
		if math.Abs(got.AverageRating-4.3) > 1e-9 {
			t.Errorf("AverageRating = %v, want 4.3 (rounded from 4.25)", got.AverageRating)
		}
		if got.TotalRatings != 12 {
			t.Errorf("TotalRatings = %d, want 12", got.TotalRatings)
		}
		if got.FavoriteCount != 5 {
			t.Errorf("FavoriteCount = %d, want 5", got.FavoriteCount)
		}
		// GetByIDsWithStats は 1 回だけ呼ばれることを確認（N+1 にならないこと）
		if repo.getByIDsWithStatsCallCount != 1 {
			t.Errorf("GetByIDsWithStats call count = %d, want 1", repo.getByIDsWithStatsCallCount)
		}
	})

	t.Run("DB既存だがヒットしていない番組が複数あってもGetByIDsWithStatsは1回のみ呼ばれる", func(t *testing.T) {
		// podlog#351: 案 B（IN 句で一括取得）の N+1 回避が機能していることの担保。
		// iTunes が 3 件返し、すべて DB に既存（DB 検索ヒットせず）の場合でも
		// GetByIDsWithStats は 1 回しか呼ばれてはいけない。
		server := newTestItunesServer(t, itunes.SearchResponse{
			ResultCount: 3,
			Results: []itunes.SearchResult{
				{CollectionID: 1001, CollectionName: "番組A"},
				{CollectionID: 1002, CollectionName: "番組B"},
				{CollectionID: 1003, CollectionName: "番組C"},
			},
		})
		defer server.Close()

		itunesClient := itunes.NewClient()
		itunesClient.SetBaseURL(server.URL)

		idA, idB, idC := uuid.New(), uuid.New(), uuid.New()
		idMap := map[int64]uuid.UUID{1001: idA, 1002: idB, 1003: idC}

		repo := &mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return []repository.PodcastSearchRow{}, 0, nil
			},
			getByItunesIDFn: func(_ context.Context, itunesID int64) (*model.Podcast, error) {
				if id, ok := idMap[itunesID]; ok {
					return &model.Podcast{ID: id, Title: fmt.Sprintf("既存%d", itunesID)}, nil
				}
				return nil, nil
			},
			getByIDsWithStatsFn: func(_ context.Context, ids []uuid.UUID) (map[uuid.UUID]repository.PodcastSearchRow, error) {
				// 渡された全 ID 分の集計値を返す（ID 数 = 3 を想定）
				if len(ids) != 3 {
					t.Errorf("GetByIDsWithStats called with %d ids, want 3 (must batch-fetch in one call)", len(ids))
				}
				out := map[uuid.UUID]repository.PodcastSearchRow{
					idA: {ID: idA, AverageRating: 1.0, TotalRatings: 1, FavoriteCount: 1},
					idB: {ID: idB, AverageRating: 2.0, TotalRatings: 2, FavoriteCount: 2},
					idC: {ID: idC, AverageRating: 3.0, TotalRatings: 3, FavoriteCount: 3},
				}
				return out, nil
			},
		}
		uc := NewPodcastUsecase(repo, itunesClient)

		result, err := uc.Search(ctx, "テスト", "", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Podcasts) != 3 {
			t.Fatalf("podcasts count = %d, want 3", len(result.Podcasts))
		}
		// N+1 回避の担保: GetByIDsWithStats は 1 回だけ呼ばれる
		if repo.getByIDsWithStatsCallCount != 1 {
			t.Errorf("GetByIDsWithStats call count = %d, want 1 (N+1 must be avoided)", repo.getByIDsWithStatsCallCount)
		}
	})

	t.Run("DB既存番組が無い（全て新規）場合はGetByIDsWithStatsを呼ばない", func(t *testing.T) {
		// 無駄な DB クエリを避けるため、埋めるべき既存番組が無いときは
		// GetByIDsWithStats を呼び出さないことを確認する。
		server := newTestItunesServer(t, itunes.SearchResponse{
			ResultCount: 1,
			Results: []itunes.SearchResult{
				{CollectionID: 2001, CollectionName: "新規番組", FeedURL: "https://example.com/feed.xml"},
			},
		})
		defer server.Close()

		itunesClient := itunes.NewClient()
		itunesClient.SetBaseURL(server.URL)

		repo := &mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return []repository.PodcastSearchRow{}, 0, nil
			},
			// getByItunesIDFn 未指定 → デフォルトで「見つからない」(新規扱い)
			createFn: func(_ context.Context, _ *model.Podcast) error {
				return nil
			},
		}
		uc := NewPodcastUsecase(repo, itunesClient)

		result, err := uc.Search(ctx, "テスト", "", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// フォールバック自体が動いていることの担保として結果件数も確認。
		// 「呼び出し回数 0」だけだとフォールバック処理全体が壊れていても通ってしまうため。
		if len(result.Podcasts) != 1 {
			t.Fatalf("podcasts count = %d, want 1 (新規登録された 1 件が返るはず)", len(result.Podcasts))
		}
		if repo.getByIDsWithStatsCallCount != 0 {
			t.Errorf("GetByIDsWithStats call count = %d, want 0 (no existing podcasts to fill)", repo.getByIDsWithStatsCallCount)
		}
	})

	t.Run("GetByIDsWithStats が失敗してもプレースホルダのまま応答を返す", func(t *testing.T) {
		// podlog#351 のフェイルセーフ動作の検証:
		// 集計値の取得（GetByIDsWithStats）が失敗した場合でも、API は 5xx を返さず
		// 番組自体は返ってくる（集計値はゼロ値のまま）ことを確認する。
		// 実装計画書の設計判断「補助的データの取得失敗で API 全体を 5xx にせず、
		// ユーザー体験を守る」のリグレッション防止。
		server := newTestItunesServer(t, itunes.SearchResponse{
			ResultCount: 1,
			Results: []itunes.SearchResult{
				{CollectionID: 99999, CollectionName: "既存番組"},
			},
		})
		defer server.Close()

		itunesClient := itunes.NewClient()
		itunesClient.SetBaseURL(server.URL)

		existingID := uuid.New()
		repo := &mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return []repository.PodcastSearchRow{}, 0, nil
			},
			getByItunesIDFn: func(_ context.Context, itunesID int64) (*model.Podcast, error) {
				if itunesID == 99999 {
					return &model.Podcast{ID: existingID, Title: "既存番組"}, nil
				}
				return nil, nil
			},
			getByIDsWithStatsFn: func(_ context.Context, _ []uuid.UUID) (map[uuid.UUID]repository.PodcastSearchRow, error) {
				// 集計値取得が失敗するケースを意図的にシミュレート
				return nil, fmt.Errorf("stats fetch failed")
			},
		}

		uc := NewPodcastUsecase(repo, itunesClient)
		result, err := uc.Search(ctx, "テスト", "", 20, 0)
		// フェイルセーフ: 集計値取得失敗でも API はエラーにせず継続する
		if err != nil {
			t.Fatalf("unexpected error: %v (集計値取得が失敗してもエラーにせず応答を返す設計)", err)
		}
		// 番組自体は返ってくる
		if len(result.Podcasts) != 1 {
			t.Fatalf("podcasts count = %d, want 1 (集計値取得失敗でも番組は返るはず)", len(result.Podcasts))
		}
		// 集計値はプレースホルダ（ゼロ値）のままになる
		got := result.Podcasts[0]
		if got.AverageRating != 0 || got.TotalRatings != 0 || got.FavoriteCount != 0 {
			t.Errorf("stats = %+v, want all zero (プレースホルダのまま返るべき)", got)
		}
		// GetByIDsWithStats は 1 回呼ばれている（呼ばれた上で失敗）
		if repo.getByIDsWithStatsCallCount != 1 {
			t.Errorf("GetByIDsWithStats call count = %d, want 1", repo.getByIDsWithStatsCallCount)
		}
	})

	t.Run("iTunes APIエラーでもDB結果は返る", func(t *testing.T) {
		// 壊れたレスポンスを返すモックサーバー
		server := newTestItunesServerRaw(t, "invalid json")
		defer server.Close()

		itunesClient := itunes.NewClient()
		itunesClient.SetBaseURL(server.URL)

		dbAuthor := "DB配信者"
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return []repository.PodcastSearchRow{
					{
						ID:     uuid.New(),
						Title:  "DB番組",
						Author: &dbAuthor,
					},
				}, 1, nil
			},
		}, itunesClient)

		result, err := uc.Search(ctx, "テスト", "", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// iTunes エラーでも DB 結果は返る
		if result.Total != 1 {
			t.Errorf("total = %d, want 1", result.Total)
		}
		if result.Podcasts[0].Title != "DB番組" {
			t.Errorf("title = %q, want %q", result.Podcasts[0].Title, "DB番組")
		}
	})

	t.Run("itunesClient が nil ならフォールバックしない", func(t *testing.T) {
		uc := NewPodcastUsecase(&mockPodcastRepoForSearch{
			searchFn: func(_ context.Context, _ string, _ []string, _, _ int) ([]repository.PodcastSearchRow, int, error) {
				return []repository.PodcastSearchRow{}, 0, nil
			},
		}, nil)

		result, err := uc.Search(ctx, "テスト", "", 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Total != 0 {
			t.Errorf("total = %d, want 0", result.Total)
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
		}, nil)

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
		}, nil)

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
		}, nil)

		_, err := uc.GetByID(ctx, uuid.New())
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

// ── テスト用ヘルパー: iTunes モックサーバー ──

// newTestItunesServer は iTunes API のモックサーバーを作成します。
// 指定した SearchResponse を JSON で返します。
// httptest.NewServer は net/http/httptest パッケージの関数で、
// テスト用のローカルHTTPサーバーを立ち上げます。
func newTestItunesServer(t *testing.T, resp itunes.SearchResponse) *httptest.Server {
	t.Helper()
	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("failed to marshal response: %v", err)
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
	}))
	return server
}

// newTestItunesServerRaw は生の文字列を返す iTunes API モックサーバーを作成します。
// 不正な JSON を返すテストケースで使用します。
func newTestItunesServerRaw(t *testing.T, body string) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(body))
	}))
	return server
}
