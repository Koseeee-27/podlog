package usecase

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// ── モックリポジトリ ──

// mockFavoritePodcastRepo は FavoritePodcastRepository のモック実装です。
// テストケースごとに各メソッドの振る舞いを差し替えます。
type mockFavoritePodcastRepo struct {
	getByUsernameFn func(ctx context.Context, username string) ([]repository.FavoritePodcastRow, error)
	replaceAllFn    func(ctx context.Context, userID uuid.UUID, podcastIDs []uuid.UUID) error
	getByUserIDFn   func(ctx context.Context, userID uuid.UUID) ([]repository.FavoritePodcastRow, error)
}

func (m *mockFavoritePodcastRepo) GetByUsername(ctx context.Context, username string) ([]repository.FavoritePodcastRow, error) {
	if m.getByUsernameFn == nil {
		return nil, fmt.Errorf("mockFavoritePodcastRepo.GetByUsername: not implemented")
	}
	return m.getByUsernameFn(ctx, username)
}

func (m *mockFavoritePodcastRepo) ReplaceAll(ctx context.Context, userID uuid.UUID, podcastIDs []uuid.UUID) error {
	if m.replaceAllFn == nil {
		return fmt.Errorf("mockFavoritePodcastRepo.ReplaceAll: not implemented")
	}
	return m.replaceAllFn(ctx, userID, podcastIDs)
}

func (m *mockFavoritePodcastRepo) GetByUserID(ctx context.Context, userID uuid.UUID) ([]repository.FavoritePodcastRow, error) {
	if m.getByUserIDFn == nil {
		return nil, fmt.Errorf("mockFavoritePodcastRepo.GetByUserID: not implemented")
	}
	return m.getByUserIDFn(ctx, userID)
}

// mockPodcastRepo は PodcastRepository のモック実装です（好きな番組テスト用）。
type mockPodcastRepo struct {
	existsByIDsFn func(ctx context.Context, ids []uuid.UUID) ([]uuid.UUID, error)
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
func (m *mockPodcastRepo) Search(_ context.Context, _ string, _ int, _ int) ([]repository.PodcastSearchRow, int, error) {
	return nil, 0, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) GetPopular(_ context.Context, _ int) ([]repository.PodcastSearchRow, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) ExistsByIDs(ctx context.Context, ids []uuid.UUID) ([]uuid.UUID, error) {
	if m.existsByIDsFn == nil {
		return nil, fmt.Errorf("mockPodcastRepo.ExistsByIDs: not implemented")
	}
	return m.existsByIDsFn(ctx, ids)
}
func (m *mockPodcastRepo) UpdateGenre(_ context.Context, _ uuid.UUID, _ string) error {
	return fmt.Errorf("not implemented")
}
func (m *mockPodcastRepo) ListWithoutGenre(_ context.Context) ([]model.Podcast, error) {
	return nil, fmt.Errorf("not implemented")
}

// ── テスト: GetByUsername ──

func TestFavoritePodcastUsecase_GetByUsername(t *testing.T) {
	ctx := context.Background()
	username := "testuser"

	t.Run("正常系: 好きな番組一覧を取得", func(t *testing.T) {
		artworkURL := "https://example.com/artwork.jpg"
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{
				getByUsernameFn: func(_ context.Context, _ string) ([]repository.FavoritePodcastRow, error) {
					return []repository.FavoritePodcastRow{
						{PodcastID: uuid.New(), Title: "Podcast A", ArtworkURL: &artworkURL},
						{PodcastID: uuid.New(), Title: "Podcast B", ArtworkURL: nil},
					}, nil
				},
			},
			&mockUserRepo{
				existsByUsernameFunc: func(_ context.Context, _ string) (bool, error) {
					return true, nil
				},
			},
			&mockPodcastRepo{},
		)

		result, err := uc.GetByUsername(ctx, username)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Podcasts) != 2 {
			t.Errorf("podcasts count = %d, want 2", len(result.Podcasts))
		}
		if result.Podcasts[0].Title != "Podcast A" {
			t.Errorf("title = %s, want Podcast A", result.Podcasts[0].Title)
		}
		if result.Podcasts[0].ArtworkURL == nil || *result.Podcasts[0].ArtworkURL != artworkURL {
			t.Errorf("artwork_url = %v, want %s", result.Podcasts[0].ArtworkURL, artworkURL)
		}
		if result.Podcasts[1].ArtworkURL != nil {
			t.Errorf("artwork_url should be nil for Podcast B")
		}
	})

	t.Run("正常系: 好きな番組が空の場合は空配列を返す", func(t *testing.T) {
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{
				getByUsernameFn: func(_ context.Context, _ string) ([]repository.FavoritePodcastRow, error) {
					return []repository.FavoritePodcastRow{}, nil
				},
			},
			&mockUserRepo{
				existsByUsernameFunc: func(_ context.Context, _ string) (bool, error) {
					return true, nil
				},
			},
			&mockPodcastRepo{},
		)

		result, err := uc.GetByUsername(ctx, username)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Podcasts) != 0 {
			t.Errorf("podcasts count = %d, want 0", len(result.Podcasts))
		}
	})

	t.Run("ユーザーが存在しない場合は NotFoundError", func(t *testing.T) {
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{},
			&mockUserRepo{
				existsByUsernameFunc: func(_ context.Context, _ string) (bool, error) {
					return false, nil
				},
			},
			&mockPodcastRepo{},
		)

		_, err := uc.GetByUsername(ctx, "nonexistent")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
	})

	t.Run("ユーザー存在チェックでDBエラー → エラー伝播", func(t *testing.T) {
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{},
			&mockUserRepo{
				existsByUsernameFunc: func(_ context.Context, _ string) (bool, error) {
					return false, fmt.Errorf("db connection error")
				},
			},
			&mockPodcastRepo{},
		)

		_, err := uc.GetByUsername(ctx, username)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if errors.As(err, &nfe) {
			t.Fatal("expected general error, not NotFoundError")
		}
	})

	t.Run("リポジトリエラー → エラー伝播", func(t *testing.T) {
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{
				getByUsernameFn: func(_ context.Context, _ string) ([]repository.FavoritePodcastRow, error) {
					return nil, fmt.Errorf("db query error")
				},
			},
			&mockUserRepo{
				existsByUsernameFunc: func(_ context.Context, _ string) (bool, error) {
					return true, nil
				},
			},
			&mockPodcastRepo{},
		)

		_, err := uc.GetByUsername(ctx, username)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

// ── テスト: UpdateFavorites ──

func TestFavoritePodcastUsecase_UpdateFavorites(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	t.Run("プロフィール未作成ユーザー（空配列） → NotFoundError", func(t *testing.T) {
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{},
			&mockUserRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.User, error) {
					return nil, nil // ユーザーが存在しない
				},
			},
			&mockPodcastRepo{},
		)

		_, err := uc.UpdateFavorites(ctx, userID, []uuid.UUID{})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
		if nfe.Resource != "profile" {
			t.Fatalf("expected Resource \"profile\", got %q", nfe.Resource)
		}
	})

	t.Run("プロフィール未作成ユーザー（非空配列） → NotFoundError", func(t *testing.T) {
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{},
			&mockUserRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.User, error) {
					return nil, nil // ユーザーが存在しない
				},
			},
			&mockPodcastRepo{},
		)

		_, err := uc.UpdateFavorites(ctx, userID, []uuid.UUID{uuid.New()})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
		if nfe.Resource != "profile" {
			t.Fatalf("expected Resource \"profile\", got %q", nfe.Resource)
		}
	})

	t.Run("ユーザー存在チェックで DB エラー → エラー伝播", func(t *testing.T) {
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{},
			&mockUserRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.User, error) {
					return nil, fmt.Errorf("db connection error")
				},
			},
			&mockPodcastRepo{},
		)

		_, err := uc.UpdateFavorites(ctx, userID, []uuid.UUID{})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if errors.As(err, &nfe) {
			t.Fatal("expected general error, not NotFoundError")
		}
	})

	t.Run("正常系: 好きな番組を一括更新", func(t *testing.T) {
		podcastID1 := uuid.New()
		podcastID2 := uuid.New()
		artworkURL := "https://example.com/art.jpg"

		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{
				replaceAllFn: func(_ context.Context, _ uuid.UUID, _ []uuid.UUID) error {
					return nil
				},
				getByUserIDFn: func(_ context.Context, _ uuid.UUID) ([]repository.FavoritePodcastRow, error) {
					return []repository.FavoritePodcastRow{
						{PodcastID: podcastID1, Title: "Podcast A", ArtworkURL: &artworkURL},
						{PodcastID: podcastID2, Title: "Podcast B", ArtworkURL: nil},
					}, nil
				},
			},
			&mockUserRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.User, error) {
					return &model.User{ID: userID, Username: "testuser", DisplayName: "Test User"}, nil
				},
			},
			&mockPodcastRepo{
				existsByIDsFn: func(_ context.Context, _ []uuid.UUID) ([]uuid.UUID, error) {
					return nil, nil // 全て存在する
				},
			},
		)

		result, err := uc.UpdateFavorites(ctx, userID, []uuid.UUID{podcastID1, podcastID2})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Podcasts) != 2 {
			t.Errorf("podcasts count = %d, want 2", len(result.Podcasts))
		}
		if result.Podcasts[0].Title != "Podcast A" {
			t.Errorf("title = %s, want Podcast A", result.Podcasts[0].Title)
		}
	})

	t.Run("正常系: 空配列で好きな番組をクリア", func(t *testing.T) {
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{
				replaceAllFn: func(_ context.Context, _ uuid.UUID, _ []uuid.UUID) error {
					return nil
				},
				getByUserIDFn: func(_ context.Context, _ uuid.UUID) ([]repository.FavoritePodcastRow, error) {
					return []repository.FavoritePodcastRow{}, nil
				},
			},
			&mockUserRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.User, error) {
					return &model.User{ID: userID, Username: "testuser", DisplayName: "Test User"}, nil
				},
			},
			&mockPodcastRepo{},
		)

		result, err := uc.UpdateFavorites(ctx, userID, []uuid.UUID{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Podcasts) != 0 {
			t.Errorf("podcasts count = %d, want 0", len(result.Podcasts))
		}
	})

	t.Run("重複した podcast_id → ValidationError", func(t *testing.T) {
		duplicateID := uuid.New()
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{},
			&mockUserRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.User, error) {
					return &model.User{ID: userID, Username: "testuser", DisplayName: "Test User"}, nil
				},
			},
			&mockPodcastRepo{},
		)

		_, err := uc.UpdateFavorites(ctx, userID, []uuid.UUID{duplicateID, duplicateID})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
	})

	t.Run("存在しない podcast_id → ValidationError", func(t *testing.T) {
		missingID := uuid.New()
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{},
			&mockUserRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.User, error) {
					return &model.User{ID: userID, Username: "testuser", DisplayName: "Test User"}, nil
				},
			},
			&mockPodcastRepo{
				existsByIDsFn: func(_ context.Context, _ []uuid.UUID) ([]uuid.UUID, error) {
					return []uuid.UUID{missingID}, nil // 1つ見つからない
				},
			},
		)

		_, err := uc.UpdateFavorites(ctx, userID, []uuid.UUID{missingID})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
	})

	t.Run("podcast 存在チェックで DB エラー → エラー伝播", func(t *testing.T) {
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{},
			&mockUserRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.User, error) {
					return &model.User{ID: userID, Username: "testuser", DisplayName: "Test User"}, nil
				},
			},
			&mockPodcastRepo{
				existsByIDsFn: func(_ context.Context, _ []uuid.UUID) ([]uuid.UUID, error) {
					return nil, fmt.Errorf("db error")
				},
			},
		)

		_, err := uc.UpdateFavorites(ctx, userID, []uuid.UUID{uuid.New()})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ve *ValidationError
		if errors.As(err, &ve) {
			t.Fatal("expected general error, not ValidationError")
		}
	})

	t.Run("ReplaceAll で DB エラー → エラー伝播", func(t *testing.T) {
		uc := NewFavoritePodcastUsecase(
			&mockFavoritePodcastRepo{
				replaceAllFn: func(_ context.Context, _ uuid.UUID, _ []uuid.UUID) error {
					return fmt.Errorf("transaction error")
				},
			},
			&mockUserRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.User, error) {
					return &model.User{ID: userID, Username: "testuser", DisplayName: "Test User"}, nil
				},
			},
			&mockPodcastRepo{
				existsByIDsFn: func(_ context.Context, _ []uuid.UUID) ([]uuid.UUID, error) {
					return nil, nil
				},
			},
		)

		_, err := uc.UpdateFavorites(ctx, userID, []uuid.UUID{uuid.New()})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}
