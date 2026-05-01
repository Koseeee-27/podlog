package usecase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// ── モックリポジトリ ──

// mockRatingRepo は RatingRepository のモック実装です。
// 各メソッドに関数フィールドを持たせ、テストケースごとに振る舞いを差し替えます。
type mockRatingRepo struct {
	createFn                    func(ctx context.Context, rating *model.Rating) error
	updateFn                    func(ctx context.Context, rating *model.Rating) error
	deleteFn                    func(ctx context.Context, userID, episodeID uuid.UUID) error
	getByUserAndEpisodeFn       func(ctx context.Context, userID, episodeID uuid.UUID) (*model.Rating, error)
	getEpisodeStatsFn           func(ctx context.Context, episodeID uuid.UUID) (float64, int, map[int]int, error)
	getUsernameStatsFn          func(ctx context.Context, username string) (float64, int, map[int]int, error)
	getAverageRatingByPodcastFn func(ctx context.Context, podcastID uuid.UUID) (float64, int, error)
	getByUserIDFn               func(ctx context.Context, userID uuid.UUID, limit, offset int) ([]repository.RatingWithDetailsRow, int, error)
}

func (m *mockRatingRepo) Create(ctx context.Context, rating *model.Rating) error {
	if m.createFn == nil {
		return fmt.Errorf("mockRatingRepo.Create: not implemented")
	}
	return m.createFn(ctx, rating)
}
func (m *mockRatingRepo) Update(ctx context.Context, rating *model.Rating) error {
	if m.updateFn == nil {
		return fmt.Errorf("mockRatingRepo.Update: not implemented")
	}
	return m.updateFn(ctx, rating)
}
func (m *mockRatingRepo) Delete(ctx context.Context, userID, episodeID uuid.UUID) error {
	if m.deleteFn == nil {
		return fmt.Errorf("mockRatingRepo.Delete: not implemented")
	}
	return m.deleteFn(ctx, userID, episodeID)
}
func (m *mockRatingRepo) GetByUserAndEpisode(ctx context.Context, userID, episodeID uuid.UUID) (*model.Rating, error) {
	if m.getByUserAndEpisodeFn == nil {
		return nil, fmt.Errorf("mockRatingRepo.GetByUserAndEpisode: not implemented")
	}
	return m.getByUserAndEpisodeFn(ctx, userID, episodeID)
}
func (m *mockRatingRepo) GetEpisodeStats(ctx context.Context, episodeID uuid.UUID) (float64, int, map[int]int, error) {
	if m.getEpisodeStatsFn == nil {
		return 0, 0, nil, fmt.Errorf("mockRatingRepo.GetEpisodeStats: not implemented")
	}
	return m.getEpisodeStatsFn(ctx, episodeID)
}
func (m *mockRatingRepo) GetUsernameStats(ctx context.Context, username string) (float64, int, map[int]int, error) {
	if m.getUsernameStatsFn == nil {
		return 0, 0, nil, fmt.Errorf("mockRatingRepo.GetUsernameStats: not implemented")
	}
	return m.getUsernameStatsFn(ctx, username)
}
func (m *mockRatingRepo) GetAverageRatingByPodcastID(ctx context.Context, podcastID uuid.UUID) (float64, int, error) {
	if m.getAverageRatingByPodcastFn == nil {
		return 0, 0, fmt.Errorf("mockRatingRepo.GetAverageRatingByPodcastID: not implemented")
	}
	return m.getAverageRatingByPodcastFn(ctx, podcastID)
}
func (m *mockRatingRepo) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]repository.RatingWithDetailsRow, int, error) {
	if m.getByUserIDFn == nil {
		return nil, 0, fmt.Errorf("mockRatingRepo.GetByUserID: not implemented")
	}
	return m.getByUserIDFn(ctx, userID, limit, offset)
}

// ── テスト: バリデーション ──

func TestValidateRating(t *testing.T) {
	t.Run("rating 0 はエラー", func(t *testing.T) {
		err := validateRating(0)
		if err == nil {
			t.Fatal("expected validation error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T", err)
		}
	})

	t.Run("rating 6 はエラー", func(t *testing.T) {
		if err := validateRating(6); err == nil {
			t.Fatal("expected validation error, got nil")
		}
	})

	t.Run("rating 1〜5 は正常", func(t *testing.T) {
		for _, r := range []int{1, 2, 3, 4, 5} {
			if err := validateRating(r); err != nil {
				t.Fatalf("rating %d: unexpected error: %v", r, err)
			}
		}
	})
}

// ── テスト: roundToOneDecimal（共通ヘルパー） ──

func TestRoundToOneDecimal(t *testing.T) {
	tests := []struct {
		input    float64
		expected float64
	}{
		{3.14159, 3.1},
		{3.16, 3.2},
		{4.0, 4.0},
		{0.0, 0.0},
		{2.96, 3.0},
	}
	for _, tt := range tests {
		got := roundToOneDecimal(tt.input)
		if math.Abs(got-tt.expected) > 1e-9 {
			t.Errorf("roundToOneDecimal(%f) = %f, want %f", tt.input, got, tt.expected)
		}
	}
}

// ── テスト: Create ──

func TestRatingUsecase_Create(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episode := newTestEpisode()

	t.Run("正常系: 評価作成成功", func(t *testing.T) {
		createdRating := newTestRating(userID, episode.ID)
		callCount := 0

		uc := NewRatingUsecase(
			&mockRatingRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Rating, error) {
					callCount++
					if callCount == 1 {
						return nil, nil // 重複なし
					}
					return createdRating, nil // 再取得
				},
				createFn: func(_ context.Context, _ *model.Rating) error {
					return nil
				},
			},
			&mockEpisodeRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.Episode, error) {
					return episode, nil
				},
			},
			nil,
		)

		result, err := uc.Create(ctx, userID, episode.ID, CreateRatingInput{Rating: 4})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Rating != 4 {
			t.Errorf("rating = %d, want 4", result.Rating)
		}
		if result.CreatedAt.IsZero() {
			t.Error("created_at should not be zero")
		}
	})

	t.Run("エピソードが存在しない → NotFoundError", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{},
			&mockEpisodeRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.Episode, error) {
					return nil, nil
				},
			},
			nil,
		)

		_, err := uc.Create(ctx, userID, uuid.New(), CreateRatingInput{Rating: 3})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
	})

	t.Run("重複評価 → ConflictError", func(t *testing.T) {
		existing := newTestRating(userID, episode.ID)
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Rating, error) {
					return existing, nil
				},
			},
			&mockEpisodeRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.Episode, error) {
					return episode, nil
				},
			},
			nil,
		)

		_, err := uc.Create(ctx, userID, episode.ID, CreateRatingInput{Rating: 3})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ce *ConflictError
		if !errors.As(err, &ce) {
			t.Fatalf("expected ConflictError, got %T: %v", err, err)
		}
	})

	t.Run("UNIQUE制約違反 → ConflictError（並行リクエスト）", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Rating, error) {
					return nil, nil // 重複なし（事前チェック通過）
				},
				createFn: func(_ context.Context, _ *model.Rating) error {
					return errors.New("duplicate key value violates unique constraint \"23505\"")
				},
			},
			&mockEpisodeRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.Episode, error) {
					return episode, nil
				},
			},
			nil,
		)

		_, err := uc.Create(ctx, userID, episode.ID, CreateRatingInput{Rating: 4})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ce *ConflictError
		if !errors.As(err, &ce) {
			t.Fatalf("expected ConflictError, got %T: %v", err, err)
		}
	})

	t.Run("rating 0 → ValidationError", func(t *testing.T) {
		uc := NewRatingUsecase(&mockRatingRepo{}, &mockEpisodeRepo{}, nil)

		_, err := uc.Create(ctx, userID, episode.ID, CreateRatingInput{Rating: 0})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
	})

	t.Run("rating 6 → ValidationError", func(t *testing.T) {
		uc := NewRatingUsecase(&mockRatingRepo{}, &mockEpisodeRepo{}, nil)

		_, err := uc.Create(ctx, userID, episode.ID, CreateRatingInput{Rating: 6})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
	})
}

// ── テスト: Update ──

func TestRatingUsecase_Update(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episodeID := uuid.New()

	t.Run("正常系: 評価更新成功", func(t *testing.T) {
		existing := newTestRating(userID, episodeID)
		callCount := 0

		uc := NewRatingUsecase(
			&mockRatingRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Rating, error) {
					callCount++
					if callCount == 1 {
						return existing, nil
					}
					updated := *existing
					updated.Rating = 5
					updated.UpdatedAt = time.Now()
					return &updated, nil
				},
				updateFn: func(_ context.Context, _ *model.Rating) error {
					return nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.Update(ctx, userID, episodeID, UpdateRatingInput{Rating: 5})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Rating != 5 {
			t.Errorf("rating = %d, want 5", result.Rating)
		}
	})

	t.Run("評価が存在しない → NotFoundError", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Rating, error) {
					return nil, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		_, err := uc.Update(ctx, userID, episodeID, UpdateRatingInput{Rating: 3})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
	})
}

// ── テスト: Delete ──

func TestRatingUsecase_Delete(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episodeID := uuid.New()

	t.Run("正常系: 削除成功", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{
				deleteFn: func(_ context.Context, _, _ uuid.UUID) error {
					return nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		if err := uc.Delete(ctx, userID, episodeID); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("存在しない評価 → NotFoundError", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{
				deleteFn: func(_ context.Context, _, _ uuid.UUID) error {
					return sql.ErrNoRows
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		err := uc.Delete(ctx, userID, episodeID)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
	})
}

// ── テスト: GetMyRating ──

func TestRatingUsecase_GetMyRating(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episodeID := uuid.New()

	t.Run("正常系: 自分の評価が存在する", func(t *testing.T) {
		existing := newTestRating(userID, episodeID)

		uc := NewRatingUsecase(
			&mockRatingRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Rating, error) {
					return existing, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.GetMyRating(ctx, userID, episodeID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.ID != existing.ID {
			t.Errorf("id = %v, want %v", result.ID, existing.ID)
		}
		if result.Rating != existing.Rating {
			t.Errorf("rating = %d, want %d", result.Rating, existing.Rating)
		}
		// API 設計書通り、user_id / episode_id も含むこと（Rating model がそのまま返るため）
		if result.UserID != userID {
			t.Errorf("user_id = %v, want %v", result.UserID, userID)
		}
		if result.EpisodeID != episodeID {
			t.Errorf("episode_id = %v, want %v", result.EpisodeID, episodeID)
		}
	})

	t.Run("評価が存在しない → NotFoundError", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Rating, error) {
					return nil, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		_, err := uc.GetMyRating(ctx, userID, episodeID)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
	})

	t.Run("リポジトリエラー → エラー伝播", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Rating, error) {
					return nil, fmt.Errorf("db connection error")
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		_, err := uc.GetMyRating(ctx, userID, episodeID)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		// NotFoundError ではなく一般的なエラーであること
		var nfe *NotFoundError
		if errors.As(err, &nfe) {
			t.Fatal("expected general error, not NotFoundError")
		}
	})
}

// ── テスト: GetEpisodeStats ──

func TestRatingUsecase_GetEpisodeStats(t *testing.T) {
	ctx := context.Background()
	episodeID := uuid.New()

	t.Run("正常系: 平均・件数・分布を取得", func(t *testing.T) {
		distribution := map[int]int{1: 0, 2: 1, 3: 2, 4: 6, 5: 6}

		uc := NewRatingUsecase(
			&mockRatingRepo{
				getEpisodeStatsFn: func(_ context.Context, _ uuid.UUID) (float64, int, map[int]int, error) {
					return 4.2, 15, distribution, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.GetEpisodeStats(ctx, episodeID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.AverageRating != 4.2 {
			t.Errorf("average_rating = %f, want 4.2", result.AverageRating)
		}
		if result.TotalRatings != 15 {
			t.Errorf("total_ratings = %d, want 15", result.TotalRatings)
		}
		// 分布マップが想定通り 1〜5 の全キーを含むこと
		for star := 1; star <= 5; star++ {
			if _, ok := result.Distribution[star]; !ok {
				t.Errorf("distribution missing key %d", star)
			}
		}
		if result.Distribution[5] != 6 {
			t.Errorf("distribution[5] = %d, want 6", result.Distribution[5])
		}
	})

	t.Run("平均値の丸め: 3.666 → 3.7", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getEpisodeStatsFn: func(_ context.Context, _ uuid.UUID) (float64, int, map[int]int, error) {
					return 3.666, 3, map[int]int{1: 0, 2: 0, 3: 1, 4: 1, 5: 1}, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.GetEpisodeStats(ctx, episodeID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.AverageRating != 3.7 {
			t.Errorf("average_rating = %f, want 3.7 (rounded)", result.AverageRating)
		}
	})

	t.Run("評価なし → 0 を返す", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getEpisodeStatsFn: func(_ context.Context, _ uuid.UUID) (float64, int, map[int]int, error) {
					return 0, 0, map[int]int{1: 0, 2: 0, 3: 0, 4: 0, 5: 0}, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.GetEpisodeStats(ctx, episodeID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.AverageRating != 0 {
			t.Errorf("average_rating = %f, want 0", result.AverageRating)
		}
		if result.TotalRatings != 0 {
			t.Errorf("total_ratings = %d, want 0", result.TotalRatings)
		}
	})

	t.Run("リポジトリエラー → エラー伝播", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getEpisodeStatsFn: func(_ context.Context, _ uuid.UUID) (float64, int, map[int]int, error) {
					return 0, 0, nil, fmt.Errorf("db error")
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		_, err := uc.GetEpisodeStats(ctx, episodeID)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}

// ── テスト: GetPodcastRating ──

func TestRatingUsecase_GetPodcastRating(t *testing.T) {
	ctx := context.Background()
	podcastID := uuid.New()

	t.Run("正常系: 平均評価取得と丸め", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getAverageRatingByPodcastFn: func(_ context.Context, _ uuid.UUID) (float64, int, error) {
					return 3.666, 3, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.GetPodcastRating(ctx, podcastID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.AverageRating != 3.7 {
			t.Errorf("average_rating = %f, want 3.7", result.AverageRating)
		}
		if result.TotalRatings != 3 {
			t.Errorf("total_ratings = %d, want 3", result.TotalRatings)
		}
	})
}

// ── テスト: GetByUserID ──

func TestRatingUsecase_GetByUserID(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	t.Run("正常系: ユーザーの評価一覧取得", func(t *testing.T) {
		now := time.Now()
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getByUserIDFn: func(_ context.Context, _ uuid.UUID, limit, _ int) ([]repository.RatingWithDetailsRow, int, error) {
					if limit != 20 {
						t.Errorf("limit = %d, want 20", limit)
					}
					return []repository.RatingWithDetailsRow{
						{
							ID: uuid.New(), Rating: 4, EpisodeID: uuid.New(), EpisodeTitle: "Ep1",
							PodcastID: uuid.New(), PodcastTitle: "Podcast1",
							CreatedAt: now, UpdatedAt: now,
						},
					}, 1, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.GetByUserID(ctx, userID, 0, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Ratings) != 1 {
			t.Errorf("ratings count = %d, want 1", len(result.Ratings))
		}
		if result.Total != 1 {
			t.Errorf("total = %d, want 1", result.Total)
		}
		if result.Ratings[0].UpdatedAt == "" {
			t.Error("expected updated_at to be set")
		}
	})

	t.Run("limit/offset の補正", func(t *testing.T) {
		var capturedLimit, capturedOffset int
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getByUserIDFn: func(_ context.Context, _ uuid.UUID, limit, offset int) ([]repository.RatingWithDetailsRow, int, error) {
					capturedLimit = limit
					capturedOffset = offset
					return nil, 0, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		// limit が負 → 20 に補正、offset が負 → 0 に補正
		_, err := uc.GetByUserID(ctx, userID, -5, -10)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if capturedLimit != 20 {
			t.Errorf("corrected limit = %d, want 20", capturedLimit)
		}
		if capturedOffset != 0 {
			t.Errorf("corrected offset = %d, want 0", capturedOffset)
		}

		// limit > 100 → 20 に補正
		_, err = uc.GetByUserID(ctx, userID, 200, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if capturedLimit != 20 {
			t.Errorf("corrected limit = %d, want 20", capturedLimit)
		}
	})
}

// ── テスト: GetUsernameStats ──

func TestRatingUsecase_GetUsernameStats(t *testing.T) {
	ctx := context.Background()
	username := "testuser"

	t.Run("正常系: ユーザーの評価統計を取得", func(t *testing.T) {
		distribution := map[int]int{1: 1, 2: 2, 3: 8, 4: 18, 5: 13}

		uc := NewRatingUsecase(
			&mockRatingRepo{
				getUsernameStatsFn: func(_ context.Context, _ string) (float64, int, map[int]int, error) {
					return 4.1, 42, distribution, nil
				},
			},
			&mockEpisodeRepo{},
			&mockUserRepo{
				existsByUsernameFunc: func(_ context.Context, _ string) (bool, error) {
					return true, nil
				},
			},
		)

		result, err := uc.GetUsernameStats(ctx, username)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.TotalRatings != 42 {
			t.Errorf("total_ratings = %d, want 42", result.TotalRatings)
		}
		if result.AverageRating != 4.1 {
			t.Errorf("average_rating = %f, want 4.1", result.AverageRating)
		}
		if result.Distribution[5] != 13 {
			t.Errorf("distribution[5] = %d, want 13", result.Distribution[5])
		}
	})

	t.Run("ユーザーが存在しない → NotFoundError", func(t *testing.T) {
		uc := NewRatingUsecase(
			&mockRatingRepo{},
			&mockEpisodeRepo{},
			&mockUserRepo{
				existsByUsernameFunc: func(_ context.Context, _ string) (bool, error) {
					return false, nil
				},
			},
		)

		_, err := uc.GetUsernameStats(ctx, "nonexistent")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
	})

	t.Run("評価が空 → 件数 0 を返す", func(t *testing.T) {
		emptyDist := map[int]int{1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
		uc := NewRatingUsecase(
			&mockRatingRepo{
				getUsernameStatsFn: func(_ context.Context, _ string) (float64, int, map[int]int, error) {
					return 0, 0, emptyDist, nil
				},
			},
			&mockEpisodeRepo{},
			&mockUserRepo{
				existsByUsernameFunc: func(_ context.Context, _ string) (bool, error) {
					return true, nil
				},
			},
		)

		result, err := uc.GetUsernameStats(ctx, username)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.TotalRatings != 0 {
			t.Errorf("total_ratings = %d, want 0", result.TotalRatings)
		}
	})
}
