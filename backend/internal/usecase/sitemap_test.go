package usecase

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// ── モックリポジトリ（Sitemap テスト用） ──

// mockSitemapRepo は SitemapRepository のモック実装です。
// 各テストで *Fn フィールドを差し替えて DB の振る舞いをシミュレートします。
type mockSitemapRepo struct {
	listPodcastsFn func(ctx context.Context) ([]repository.PodcastSitemapRow, error)
	listEpisodesFn func(ctx context.Context) ([]repository.EpisodeSitemapRow, error)
	listUsersFn    func(ctx context.Context) ([]repository.UserSitemapRow, error)
}

func (m *mockSitemapRepo) ListPodcasts(ctx context.Context) ([]repository.PodcastSitemapRow, error) {
	if m.listPodcastsFn == nil {
		return nil, fmt.Errorf("not implemented")
	}
	return m.listPodcastsFn(ctx)
}

func (m *mockSitemapRepo) ListEpisodes(ctx context.Context) ([]repository.EpisodeSitemapRow, error) {
	if m.listEpisodesFn == nil {
		return nil, fmt.Errorf("not implemented")
	}
	return m.listEpisodesFn(ctx)
}

func (m *mockSitemapRepo) ListUsers(ctx context.Context) ([]repository.UserSitemapRow, error) {
	if m.listUsersFn == nil {
		return nil, fmt.Errorf("not implemented")
	}
	return m.listUsersFn(ctx)
}

// ── テスト: GetPodcasts ──

func TestSitemapUsecase_GetPodcasts(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: 取得結果が RFC3339 文字列で返される", func(t *testing.T) {
		id1 := uuid.New()
		id2 := uuid.New()
		// JST のタイムゾーンを使い、UTC 変換が効いていることを確認する。
		jst := time.FixedZone("JST", 9*60*60)
		t1 := time.Date(2026, 4, 1, 12, 0, 0, 0, jst)        // 03:00:00Z
		t2 := time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC)   // 00:00:00Z

		uc := NewSitemapUsecase(&mockSitemapRepo{
			listPodcastsFn: func(_ context.Context) ([]repository.PodcastSitemapRow, error) {
				return []repository.PodcastSitemapRow{
					{ID: id1, UpdatedAt: t1},
					{ID: id2, UpdatedAt: t2},
				}, nil
			},
		})

		result, err := uc.GetPodcasts(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Items) != 2 {
			t.Fatalf("items count = %d, want 2", len(result.Items))
		}

		if result.Items[0].ID != id1 {
			t.Errorf("items[0].id = %v, want %v", result.Items[0].ID, id1)
		}
		// JST → UTC 変換結果を確認
		if got, want := result.Items[0].UpdatedAt, "2026-04-01T03:00:00Z"; got != want {
			t.Errorf("items[0].updated_at = %q, want %q", got, want)
		}
		if got, want := result.Items[1].UpdatedAt, "2026-03-15T00:00:00Z"; got != want {
			t.Errorf("items[1].updated_at = %q, want %q", got, want)
		}
	})

	t.Run("正常系: 0件の場合は空配列を返す（nil ではなく）", func(t *testing.T) {
		uc := NewSitemapUsecase(&mockSitemapRepo{
			listPodcastsFn: func(_ context.Context) ([]repository.PodcastSitemapRow, error) {
				return []repository.PodcastSitemapRow{}, nil
			},
		})

		result, err := uc.GetPodcasts(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// 0件でも nil ではなく空スライスを返すことで、JSON で [] になる
		if result.Items == nil {
			t.Fatal("items is nil, want empty slice")
		}
		if len(result.Items) != 0 {
			t.Errorf("items count = %d, want 0", len(result.Items))
		}
	})

	t.Run("DB エラー → エラーが伝播する", func(t *testing.T) {
		uc := NewSitemapUsecase(&mockSitemapRepo{
			listPodcastsFn: func(_ context.Context) ([]repository.PodcastSitemapRow, error) {
				return nil, fmt.Errorf("db down")
			},
		})

		_, err := uc.GetPodcasts(ctx)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

// ── テスト: GetEpisodes ──

func TestSitemapUsecase_GetEpisodes(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: 取得結果が RFC3339 文字列で返される", func(t *testing.T) {
		id := uuid.New()
		t1 := time.Date(2026, 4, 10, 9, 30, 45, 0, time.UTC)

		uc := NewSitemapUsecase(&mockSitemapRepo{
			listEpisodesFn: func(_ context.Context) ([]repository.EpisodeSitemapRow, error) {
				return []repository.EpisodeSitemapRow{
					{ID: id, UpdatedAt: t1},
				}, nil
			},
		})

		result, err := uc.GetEpisodes(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Items) != 1 {
			t.Fatalf("items count = %d, want 1", len(result.Items))
		}
		if got, want := result.Items[0].UpdatedAt, "2026-04-10T09:30:45Z"; got != want {
			t.Errorf("updated_at = %q, want %q", got, want)
		}
	})

	t.Run("正常系: 0件の場合は空配列を返す", func(t *testing.T) {
		uc := NewSitemapUsecase(&mockSitemapRepo{
			listEpisodesFn: func(_ context.Context) ([]repository.EpisodeSitemapRow, error) {
				return []repository.EpisodeSitemapRow{}, nil
			},
		})

		result, err := uc.GetEpisodes(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Items == nil {
			t.Fatal("items is nil, want empty slice")
		}
		if len(result.Items) != 0 {
			t.Errorf("items count = %d, want 0", len(result.Items))
		}
	})

	t.Run("DB エラー → エラーが伝播する", func(t *testing.T) {
		uc := NewSitemapUsecase(&mockSitemapRepo{
			listEpisodesFn: func(_ context.Context) ([]repository.EpisodeSitemapRow, error) {
				return nil, fmt.Errorf("db down")
			},
		})

		_, err := uc.GetEpisodes(ctx)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

// ── テスト: GetUsers ──

func TestSitemapUsecase_GetUsers(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: username と updated_at が返される", func(t *testing.T) {
		t1 := time.Date(2026, 4, 5, 0, 0, 0, 0, time.UTC)
		t2 := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)

		uc := NewSitemapUsecase(&mockSitemapRepo{
			listUsersFn: func(_ context.Context) ([]repository.UserSitemapRow, error) {
				return []repository.UserSitemapRow{
					{Username: "alice", UpdatedAt: t1},
					{Username: "bob", UpdatedAt: t2},
				}, nil
			},
		})

		result, err := uc.GetUsers(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Items) != 2 {
			t.Fatalf("items count = %d, want 2", len(result.Items))
		}
		if result.Items[0].Username != "alice" {
			t.Errorf("items[0].username = %q, want %q", result.Items[0].Username, "alice")
		}
		if got, want := result.Items[0].UpdatedAt, "2026-04-05T00:00:00Z"; got != want {
			t.Errorf("items[0].updated_at = %q, want %q", got, want)
		}
		if result.Items[1].Username != "bob" {
			t.Errorf("items[1].username = %q, want %q", result.Items[1].Username, "bob")
		}
	})

	t.Run("正常系: 0件の場合は空配列を返す", func(t *testing.T) {
		uc := NewSitemapUsecase(&mockSitemapRepo{
			listUsersFn: func(_ context.Context) ([]repository.UserSitemapRow, error) {
				return []repository.UserSitemapRow{}, nil
			},
		})

		result, err := uc.GetUsers(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Items == nil {
			t.Fatal("items is nil, want empty slice")
		}
		if len(result.Items) != 0 {
			t.Errorf("items count = %d, want 0", len(result.Items))
		}
	})

	t.Run("DB エラー → エラーが伝播する", func(t *testing.T) {
		uc := NewSitemapUsecase(&mockSitemapRepo{
			listUsersFn: func(_ context.Context) ([]repository.UserSitemapRow, error) {
				return nil, fmt.Errorf("db down")
			},
		})

		_, err := uc.GetUsers(ctx)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}
