package usecase

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/repository"
)

// ── モックリポジトリ ──

// mockFavoritePodcastRepo は FavoritePodcastRepository のモック実装です。
// テストケースごとに GetByUsername の振る舞いを差し替えます。
type mockFavoritePodcastRepo struct {
	getByUsernameFn func(ctx context.Context, username string) ([]repository.FavoritePodcastRow, error)
}

func (m *mockFavoritePodcastRepo) GetByUsername(ctx context.Context, username string) ([]repository.FavoritePodcastRow, error) {
	if m.getByUsernameFn == nil {
		return nil, fmt.Errorf("mockFavoritePodcastRepo.GetByUsername: not implemented")
	}
	return m.getByUsernameFn(ctx, username)
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
		)

		_, err := uc.GetByUsername(ctx, username)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		// NotFoundError ではなく一般的なエラーであること
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
		)

		_, err := uc.GetByUsername(ctx, username)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}
