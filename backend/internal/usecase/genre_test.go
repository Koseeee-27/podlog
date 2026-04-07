package usecase

import (
	"context"
	"fmt"
	"testing"
	"time"

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
func (m *mockPodcastRepoForGenre) ListWithoutEpisodes(_ context.Context) ([]model.Podcast, error) {
	return nil, fmt.Errorf("not implemented")
}
func (m *mockPodcastRepoForGenre) UpdateFeedLastFetchedAt(_ context.Context, _ uuid.UUID, _ time.Time) error {
	return nil
}

// ── テスト: ListGenres ──

func TestGenreUsecase_ListGenres(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: 日本語の親カテゴリが英語 ID 付きで返される", func(t *testing.T) {
		// DB には日本語名で保存されている
		uc := NewGenreUsecase(&mockPodcastRepoForGenre{
			getDistinctGenresFn: func(_ context.Context) ([]string, error) {
				return []string{"コメディ", "ニュース", "スポーツ"}, nil
			},
		})

		result, err := uc.ListGenres(ctx)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Genres) != 3 {
			t.Fatalf("genres count = %d, want 3", len(result.Genres))
		}

		// 日本語名のソート順: コメディ, スポーツ, ニュース
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

		if result.Genres[1].ID != "Sports" {
			t.Errorf("id = %q, want %q", result.Genres[1].ID, "Sports")
		}
		if result.Genres[1].NameJA != "スポーツ" {
			t.Errorf("name_ja = %q, want %q", result.Genres[1].NameJA, "スポーツ")
		}

		if result.Genres[2].ID != "News" {
			t.Errorf("id = %q, want %q", result.Genres[2].ID, "News")
		}
		if result.Genres[2].NameJA != "ニュース" {
			t.Errorf("name_ja = %q, want %q", result.Genres[2].NameJA, "ニュース")
		}
	})

	t.Run("正常系: サブカテゴリが親カテゴリに集約される", func(t *testing.T) {
		// DB に日本語のサブカテゴリが複数あるとき、全て親カテゴリに集約される
		uc := NewGenreUsecase(&mockPodcastRepoForGenre{
			getDistinctGenresFn: func(_ context.Context) ([]string, error) {
				return []string{"コメディ", "コメディ・インタビュー", "即興コメディ", "スタンドアップ・コメディ"}, nil
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
		// コメディ系 + ニュース系 + スポーツ系 が混在する場合
		uc := NewGenreUsecase(&mockPodcastRepoForGenre{
			getDistinctGenresFn: func(_ context.Context) ([]string, error) {
				return []string{
					"コメディ・インタビュー", "即興コメディ", // → コメディ
					"今日のニュース", "ニュース解説", // → ニュース
					"アメリカンフットボール", "ゴルフ", "サッカー", // → スポーツ
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

		// 日本語ソート順: コメディ, スポーツ, ニュース
		if result.Genres[0].ID != "Comedy" {
			t.Errorf("genres[0].id = %q, want %q", result.Genres[0].ID, "Comedy")
		}
		if result.Genres[1].ID != "Sports" {
			t.Errorf("genres[1].id = %q, want %q", result.Genres[1].ID, "Sports")
		}
		if result.Genres[2].ID != "News" {
			t.Errorf("genres[2].id = %q, want %q", result.Genres[2].ID, "News")
		}
	})

	t.Run("正常系: 未知のジャンルはそのままフォールバック", func(t *testing.T) {
		uc := NewGenreUsecase(&mockPodcastRepoForGenre{
			getDistinctGenresFn: func(_ context.Context) ([]string, error) {
				return []string{"未知のジャンル"}, nil
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
		// マッピングにない場合、ID/NameEN/NameJA は全て元の値のまま
		if g.ID != "未知のジャンル" {
			t.Errorf("id = %q, want %q", g.ID, "未知のジャンル")
		}
		if g.NameJA != "未知のジャンル" {
			t.Errorf("name_ja = %q, want %q", g.NameJA, "未知のジャンル")
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
	t.Run("英語の親カテゴリ名を渡すと日本語のサブカテゴリ一覧が返る", func(t *testing.T) {
		// フロントエンドは "Comedy" を送ってくるので、日本語サブカテゴリに展開される
		subs := ExpandGenre("Comedy")
		// Comedy には コメディ, コメディ・インタビュー, スタンドアップ・コメディ, 即興コメディ が含まれるはず
		if len(subs) < 4 {
			t.Errorf("ExpandGenre(\"Comedy\") returned %d genres, want >= 4", len(subs))
		}

		// "コメディ" 自身が含まれているか確認
		found := false
		for _, s := range subs {
			if s == "コメディ" {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("ExpandGenre(\"Comedy\") does not contain 'コメディ' itself: %v", subs)
		}
	})

	t.Run("日本語の親カテゴリ名でも展開できる", func(t *testing.T) {
		subs := ExpandGenre("コメディ")
		if len(subs) < 4 {
			t.Errorf("ExpandGenre(\"コメディ\") returned %d genres, want >= 4", len(subs))
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
	t.Run("日本語サブカテゴリを親カテゴリに変換", func(t *testing.T) {
		tests := []struct {
			input string
			want  string
		}{
			{"即興コメディ", "コメディ"},
			{"スタンドアップ・コメディ", "コメディ"},
			{"コメディ・インタビュー", "コメディ"},
			{"今日のニュース", "ニュース"},
			{"ニュース解説", "ニュース"},
			{"アメリカンフットボール", "スポーツ"},
			{"ゴルフ", "スポーツ"},
			{"コメディ", "コメディ"},  // 親カテゴリ自身はそのまま
			{"ニュース", "ニュース"},   // 親カテゴリ自身はそのまま
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
