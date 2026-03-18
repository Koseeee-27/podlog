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
func (m *mockPodcastRepoForGenre) Search(_ context.Context, _ string, _ []string, _ int, _ int) ([]repository.PodcastSearchRow, int, error) {
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
func (m *mockPodcastRepoForGenre) UpdateGenre(_ context.Context, _ uuid.UUID, _ string) error {
	return fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForGenre) ListWithoutGenre(_ context.Context) ([]model.Podcast, error) {
	return nil, fmt.Errorf("not implemented")
}

// ── テスト: ListGenres ──

func TestGenreUsecase_ListGenres(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: 親カテゴリは日本語名に変換される", func(t *testing.T) {
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

		// ソート済みなので Comedy, News, Sports の順
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

		if result.Genres[1].NameJA != "ニュース" {
			t.Errorf("name_ja = %q, want %q", result.Genres[1].NameJA, "ニュース")
		}

		if result.Genres[2].NameJA != "スポーツ" {
			t.Errorf("name_ja = %q, want %q", result.Genres[2].NameJA, "スポーツ")
		}
	})

	t.Run("正常系: サブカテゴリが親カテゴリに集約される", func(t *testing.T) {
		// DB に "Comedy", "Improv", "Stand-Up", "Comedy Interviews" があるとき、
		// 全て "Comedy" に集約されて1つだけ返るはず
		uc := NewGenreUsecase(&mockPodcastRepoForGenre{
			getDistinctGenresFn: func(_ context.Context) ([]string, error) {
				return []string{"Comedy", "Comedy Interviews", "Improv", "Stand-Up"}, nil
			},
		})

		result, err := uc.ListGenres(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Genres) != 1 {
			t.Fatalf("genres count = %d, want 1 (all should be aggregated to Comedy)", len(result.Genres))
		}

		g := result.Genres[0]
		if g.ID != "Comedy" {
			t.Errorf("id = %q, want %q", g.ID, "Comedy")
		}
		if g.NameJA != "コメディ" {
			t.Errorf("name_ja = %q, want %q", g.NameJA, "コメディ")
		}
	})

	t.Run("正常系: 異なる親カテゴリのサブカテゴリが混在しても正しく集約される", func(t *testing.T) {
		// Comedy系 + News系 + Sports系 が混在する場合
		uc := NewGenreUsecase(&mockPodcastRepoForGenre{
			getDistinctGenresFn: func(_ context.Context) ([]string, error) {
				return []string{
					"Comedy Interviews", "Improv",       // → Comedy
					"Daily News", "News Commentary",      // → News
					"Baseball", "Basketball", "Football",  // → Sports
				}, nil
			},
		})

		result, err := uc.ListGenres(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Genres) != 3 {
			t.Fatalf("genres count = %d, want 3", len(result.Genres))
		}

		// アルファベット順: Comedy, News, Sports
		if result.Genres[0].ID != "Comedy" {
			t.Errorf("genres[0].id = %q, want %q", result.Genres[0].ID, "Comedy")
		}
		if result.Genres[1].ID != "News" {
			t.Errorf("genres[1].id = %q, want %q", result.Genres[1].ID, "News")
		}
		if result.Genres[2].ID != "Sports" {
			t.Errorf("genres[2].id = %q, want %q", result.Genres[2].ID, "Sports")
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

// ── テスト: ExpandGenre ──

func TestExpandGenre(t *testing.T) {
	t.Run("親カテゴリを渡すとサブカテゴリ一覧が返る", func(t *testing.T) {
		subs := ExpandGenre("Comedy")
		// Comedy には少なくとも Comedy, Comedy Fiction, Comedy Interviews, Improv, Stand-Up が含まれるはず
		if len(subs) < 5 {
			t.Errorf("ExpandGenre(\"Comedy\") returned %d genres, want >= 5", len(subs))
		}

		// Comedy 自身が含まれているか確認
		found := false
		for _, s := range subs {
			if s == "Comedy" {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("ExpandGenre(\"Comedy\") does not contain 'Comedy' itself: %v", subs)
		}
	})

	t.Run("マッピングにないジャンルはそのまま返る", func(t *testing.T) {
		subs := ExpandGenre("SomeUnknownGenre")
		if len(subs) != 1 {
			t.Fatalf("ExpandGenre(\"SomeUnknownGenre\") returned %d genres, want 1", len(subs))
		}
		if subs[0] != "SomeUnknownGenre" {
			t.Errorf("subs[0] = %q, want %q", subs[0], "SomeUnknownGenre")
		}
	})
}

// ── テスト: ToParentGenre ──

func TestToParentGenre(t *testing.T) {
	t.Run("サブカテゴリを親カテゴリに変換", func(t *testing.T) {
		tests := []struct {
			input string
			want  string
		}{
			{"Improv", "Comedy"},
			{"Stand-Up", "Comedy"},
			{"Comedy Interviews", "Comedy"},
			{"Daily News", "News"},
			{"News Commentary", "News"},
			{"Baseball", "Sports"},
			{"Basketball", "Sports"},
			{"Comedy", "Comedy"},  // 親カテゴリ自身はそのまま
			{"News", "News"},      // 親カテゴリ自身はそのまま
		}

		for _, tt := range tests {
			got := ToParentGenre(tt.input)
			if got != tt.want {
				t.Errorf("ToParentGenre(%q) = %q, want %q", tt.input, got, tt.want)
			}
		}
	})

	t.Run("未知のジャンルはそのまま返る", func(t *testing.T) {
		got := ToParentGenre("UnknownGenre")
		if got != "UnknownGenre" {
			t.Errorf("ToParentGenre(\"UnknownGenre\") = %q, want %q", got, "UnknownGenre")
		}
	})
}
