package usecase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/model"
	"github.com/kobayashikosei/podlog/backend/internal/repository"
)

// ── モックリポジトリ ──

// mockReviewRepo は ReviewRepository のモック実装です。
// 各メソッドに関数フィールドを持たせ、テストケースごとに振る舞いを差し替えます。
type mockReviewRepo struct {
	createFn                    func(ctx context.Context, review *model.Review) error
	updateFn                    func(ctx context.Context, review *model.Review) error
	deleteFn                    func(ctx context.Context, userID, episodeID uuid.UUID) error
	getByUserAndEpisodeFn       func(ctx context.Context, userID, episodeID uuid.UUID) (*model.Review, error)
	getByEpisodeIDFn            func(ctx context.Context, episodeID uuid.UUID, limit, offset int) ([]repository.ReviewWithUserRow, int, error)
	getAverageRatingByEpisodeFn func(ctx context.Context, episodeID uuid.UUID) (float64, int, error)
	getAverageRatingByPodcastFn func(ctx context.Context, podcastID uuid.UUID) (float64, int, error)
	getByUserIDFn               func(ctx context.Context, userID uuid.UUID, limit, offset int) ([]repository.ReviewWithDetailsRow, int, error)
	getByUsernameFn             func(ctx context.Context, username string, limit, offset int) ([]repository.ReviewWithDetailsRow, int, error)
	getTimelineFn               func(ctx context.Context, limit, offset int) ([]repository.TimelineRow, int, error)
}

func (m *mockReviewRepo) Create(ctx context.Context, review *model.Review) error {
	if m.createFn == nil {
		return fmt.Errorf("mockReviewRepo.Create: not implemented")
	}
	return m.createFn(ctx, review)
}
func (m *mockReviewRepo) Update(ctx context.Context, review *model.Review) error {
	if m.updateFn == nil {
		return fmt.Errorf("mockReviewRepo.Update: not implemented")
	}
	return m.updateFn(ctx, review)
}
func (m *mockReviewRepo) Delete(ctx context.Context, userID, episodeID uuid.UUID) error {
	if m.deleteFn == nil {
		return fmt.Errorf("mockReviewRepo.Delete: not implemented")
	}
	return m.deleteFn(ctx, userID, episodeID)
}
func (m *mockReviewRepo) GetByUserAndEpisode(ctx context.Context, userID, episodeID uuid.UUID) (*model.Review, error) {
	if m.getByUserAndEpisodeFn == nil {
		return nil, fmt.Errorf("mockReviewRepo.GetByUserAndEpisode: not implemented")
	}
	return m.getByUserAndEpisodeFn(ctx, userID, episodeID)
}
func (m *mockReviewRepo) GetByEpisodeID(ctx context.Context, episodeID uuid.UUID, limit, offset int) ([]repository.ReviewWithUserRow, int, error) {
	if m.getByEpisodeIDFn == nil {
		return nil, 0, fmt.Errorf("mockReviewRepo.GetByEpisodeID: not implemented")
	}
	return m.getByEpisodeIDFn(ctx, episodeID, limit, offset)
}
func (m *mockReviewRepo) GetAverageRatingByEpisodeID(ctx context.Context, episodeID uuid.UUID) (float64, int, error) {
	if m.getAverageRatingByEpisodeFn == nil {
		return 0, 0, fmt.Errorf("mockReviewRepo.GetAverageRatingByEpisodeID: not implemented")
	}
	return m.getAverageRatingByEpisodeFn(ctx, episodeID)
}
func (m *mockReviewRepo) GetAverageRatingByPodcastID(ctx context.Context, podcastID uuid.UUID) (float64, int, error) {
	if m.getAverageRatingByPodcastFn == nil {
		return 0, 0, fmt.Errorf("mockReviewRepo.GetAverageRatingByPodcastID: not implemented")
	}
	return m.getAverageRatingByPodcastFn(ctx, podcastID)
}
func (m *mockReviewRepo) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]repository.ReviewWithDetailsRow, int, error) {
	if m.getByUserIDFn == nil {
		return nil, 0, fmt.Errorf("mockReviewRepo.GetByUserID: not implemented")
	}
	return m.getByUserIDFn(ctx, userID, limit, offset)
}
func (m *mockReviewRepo) GetByUsername(ctx context.Context, username string, limit, offset int) ([]repository.ReviewWithDetailsRow, int, error) {
	if m.getByUsernameFn == nil {
		return nil, 0, fmt.Errorf("mockReviewRepo.GetByUsername: not implemented")
	}
	return m.getByUsernameFn(ctx, username, limit, offset)
}
func (m *mockReviewRepo) GetTimeline(ctx context.Context, limit, offset int) ([]repository.TimelineRow, int, error) {
	if m.getTimelineFn == nil {
		return nil, 0, fmt.Errorf("mockReviewRepo.GetTimeline: not implemented")
	}
	return m.getTimelineFn(ctx, limit, offset)
}

// ── テスト: バリデーション ──

func TestValidateReviewInput(t *testing.T) {
	t.Run("rating 0 はエラー", func(t *testing.T) {
		err := validateReviewInput(0, nil)
		if err == nil {
			t.Fatal("expected validation error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T", err)
		}
	})

	t.Run("rating 6 はエラー", func(t *testing.T) {
		err := validateReviewInput(6, nil)
		if err == nil {
			t.Fatal("expected validation error, got nil")
		}
	})

	t.Run("rating 1〜5 は正常", func(t *testing.T) {
		for _, r := range []int{1, 2, 3, 4, 5} {
			if err := validateReviewInput(r, nil); err != nil {
				t.Fatalf("rating %d: unexpected error: %v", r, err)
			}
		}
	})

	t.Run("comment ちょうど1000文字は正常", func(t *testing.T) {
		comment := strPtr(strings.Repeat("a", 1000))
		if err := validateReviewInput(3, comment); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("comment 1001文字超はエラー", func(t *testing.T) {
		// 1001 バイトの文字列を作る
		long := make([]byte, 1001)
		for i := range long {
			long[i] = 'a'
		}
		s := string(long)
		err := validateReviewInput(3, &s)
		if err == nil {
			t.Fatal("expected validation error for long comment")
		}
	})

	t.Run("comment nil は正常", func(t *testing.T) {
		if err := validateReviewInput(3, nil); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}

// ── テスト: roundToOneDecimal ──

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

func TestReviewUsecase_Create(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episode := newTestEpisode()

	t.Run("正常系: レビュー作成成功", func(t *testing.T) {
		createdReview := newTestReview(userID, episode.ID)
		callCount := 0

		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Review, error) {
					callCount++
					if callCount == 1 {
						return nil, nil // 重複なし
					}
					return createdReview, nil // 再取得
				},
				createFn: func(_ context.Context, _ *model.Review) error {
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

		result, err := uc.Create(ctx, userID, episode.ID, CreateReviewInput{Rating: 4})
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
		uc := NewReviewUsecase(
			&mockReviewRepo{},
			&mockEpisodeRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.Episode, error) {
					return nil, nil
				},
			},
			nil,
		)

		_, err := uc.Create(ctx, userID, uuid.New(), CreateReviewInput{Rating: 3})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
	})

	t.Run("重複レビュー → ConflictError", func(t *testing.T) {
		existing := newTestReview(userID, episode.ID)
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Review, error) {
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

		_, err := uc.Create(ctx, userID, episode.ID, CreateReviewInput{Rating: 3})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ce *ConflictError
		if !errors.As(err, &ce) {
			t.Fatalf("expected ConflictError, got %T: %v", err, err)
		}
	})

	t.Run("UNIQUE制約違反 → ConflictError（並行リクエスト）", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Review, error) {
					return nil, nil // 重複なし（事前チェック通過）
				},
				createFn: func(_ context.Context, _ *model.Review) error {
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

		_, err := uc.Create(ctx, userID, episode.ID, CreateReviewInput{Rating: 4})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ce *ConflictError
		if !errors.As(err, &ce) {
			t.Fatalf("expected ConflictError, got %T: %v", err, err)
		}
	})

	t.Run("rating 0 → ValidationError", func(t *testing.T) {
		uc := NewReviewUsecase(&mockReviewRepo{}, &mockEpisodeRepo{}, nil)

		_, err := uc.Create(ctx, userID, episode.ID, CreateReviewInput{Rating: 0})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
	})

	t.Run("rating 6 → ValidationError", func(t *testing.T) {
		uc := NewReviewUsecase(&mockReviewRepo{}, &mockEpisodeRepo{}, nil)

		_, err := uc.Create(ctx, userID, episode.ID, CreateReviewInput{Rating: 6})
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

func TestReviewUsecase_Update(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episodeID := uuid.New()

	t.Run("正常系: レビュー更新成功", func(t *testing.T) {
		existing := newTestReview(userID, episodeID)
		callCount := 0

		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Review, error) {
					callCount++
					if callCount == 1 {
						return existing, nil
					}
					updated := *existing
					updated.Rating = 5
					updated.UpdatedAt = time.Now()
					return &updated, nil
				},
				updateFn: func(_ context.Context, _ *model.Review) error {
					return nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.Update(ctx, userID, episodeID, UpdateReviewInput{Rating: 5})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Rating != 5 {
			t.Errorf("rating = %d, want 5", result.Rating)
		}
	})

	t.Run("レビューが存在しない → NotFoundError", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Review, error) {
					return nil, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		_, err := uc.Update(ctx, userID, episodeID, UpdateReviewInput{Rating: 3})
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

func TestReviewUsecase_Delete(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episodeID := uuid.New()

	t.Run("正常系: 削除成功", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{
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

	t.Run("存在しないレビュー → NotFoundError", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{
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

// ── テスト: GetByEpisodeID ──

func TestReviewUsecase_GetByEpisodeID(t *testing.T) {
	ctx := context.Background()
	episodeID := uuid.New()

	t.Run("正常系: レビュー一覧取得", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByEpisodeIDFn: func(_ context.Context, _ uuid.UUID, limit, offset int) ([]repository.ReviewWithUserRow, int, error) {
					if limit != 20 {
						t.Errorf("limit = %d, want 20", limit)
					}
					return []repository.ReviewWithUserRow{
						{ID: uuid.New(), UserID: uuid.New(), Username: "user1", DisplayName: "User 1", Rating: 4, CreatedAt: time.Now()},
					}, 1, nil
				},
				getAverageRatingByEpisodeFn: func(_ context.Context, _ uuid.UUID) (float64, int, error) {
					return 4.0, 1, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.GetByEpisodeID(ctx, episodeID, 0, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Reviews) != 1 {
			t.Errorf("reviews count = %d, want 1", len(result.Reviews))
		}
		if result.Total != 1 {
			t.Errorf("total = %d, want 1", result.Total)
		}
		if result.AverageRating != 4.0 {
			t.Errorf("average_rating = %f, want 4.0", result.AverageRating)
		}
	})

	t.Run("limit/offset の補正", func(t *testing.T) {
		var capturedLimit, capturedOffset int
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByEpisodeIDFn: func(_ context.Context, _ uuid.UUID, limit, offset int) ([]repository.ReviewWithUserRow, int, error) {
					capturedLimit = limit
					capturedOffset = offset
					return nil, 0, nil
				},
				getAverageRatingByEpisodeFn: func(_ context.Context, _ uuid.UUID) (float64, int, error) {
					return 0, 0, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		// limit が負 → 20 に補正
		_, err := uc.GetByEpisodeID(ctx, episodeID, -5, -10)
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
		_, err = uc.GetByEpisodeID(ctx, episodeID, 200, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if capturedLimit != 20 {
			t.Errorf("corrected limit = %d, want 20", capturedLimit)
		}
	})
}

// ── テスト: GetPodcastRating ──

func TestReviewUsecase_GetPodcastRating(t *testing.T) {
	ctx := context.Background()
	podcastID := uuid.New()

	t.Run("正常系: 平均評価取得と丸め", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{
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
		if result.TotalReviews != 3 {
			t.Errorf("total_reviews = %d, want 3", result.TotalReviews)
		}
	})
}

// ── テスト: GetByUserID ──

func TestReviewUsecase_GetByUserID(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	t.Run("正常系: ユーザーのレビュー一覧取得", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUserIDFn: func(_ context.Context, _ uuid.UUID, limit, offset int) ([]repository.ReviewWithDetailsRow, int, error) {
					if limit != 20 {
						t.Errorf("limit = %d, want 20", limit)
					}
					return []repository.ReviewWithDetailsRow{
						{
							ID: uuid.New(), Rating: 4, EpisodeID: uuid.New(), EpisodeTitle: "Ep1",
							PodcastID: uuid.New(), PodcastTitle: "Podcast1", CreatedAt: time.Now(),
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
		if len(result.Reviews) != 1 {
			t.Errorf("reviews count = %d, want 1", len(result.Reviews))
		}
		if result.Total != 1 {
			t.Errorf("total = %d, want 1", result.Total)
		}
	})

	t.Run("limit/offset の補正", func(t *testing.T) {
		var capturedLimit, capturedOffset int
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUserIDFn: func(_ context.Context, _ uuid.UUID, limit, offset int) ([]repository.ReviewWithDetailsRow, int, error) {
					capturedLimit = limit
					capturedOffset = offset
					return nil, 0, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		// limit が負 → 20 に補正
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

// ── テスト: GetTimeline ──

func TestReviewUsecase_GetTimeline(t *testing.T) {
	ctx := context.Background()

	t.Run("正常系: タイムライン取得", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getTimelineFn: func(_ context.Context, limit, offset int) ([]repository.TimelineRow, int, error) {
					return []repository.TimelineRow{
						{
							ID: uuid.New(), UserID: uuid.New(), Username: "user1", DisplayName: "User 1",
							EpisodeID: uuid.New(), EpisodeTitle: "Ep1", PodcastID: uuid.New(), PodcastTitle: "Podcast1",
							Rating: 5, CreatedAt: time.Now(),
						},
					}, 1, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.GetTimeline(ctx, 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Reviews) != 1 {
			t.Errorf("reviews count = %d, want 1", len(result.Reviews))
		}
		if result.Total != 1 {
			t.Errorf("total = %d, want 1", result.Total)
		}
	})
}

// ── テスト: GetMyReview ──

func TestReviewUsecase_GetMyReview(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episodeID := uuid.New()

	t.Run("正常系: 自分のレビューが存在する", func(t *testing.T) {
		existing := newTestReview(userID, episodeID)
		comment := "テストコメント"
		existing.Comment = &comment

		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Review, error) {
					return existing, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.GetMyReview(ctx, userID, episodeID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.ID != existing.ID {
			t.Errorf("id = %v, want %v", result.ID, existing.ID)
		}
		if result.Rating != existing.Rating {
			t.Errorf("rating = %d, want %d", result.Rating, existing.Rating)
		}
		if result.Comment == nil || *result.Comment != comment {
			t.Errorf("comment = %v, want %v", result.Comment, comment)
		}
		if result.CreatedAt == "" {
			t.Error("created_at should not be empty")
		}
		if result.UpdatedAt == "" {
			t.Error("updated_at should not be empty")
		}
	})

	t.Run("レビューが存在しない → NotFoundError", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Review, error) {
					return nil, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		_, err := uc.GetMyReview(ctx, userID, episodeID)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
	})

	t.Run("リポジトリエラー → エラー伝播", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.Review, error) {
					return nil, fmt.Errorf("db connection error")
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		_, err := uc.GetMyReview(ctx, userID, episodeID)
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

// ── テスト: GetByUsername ──

func TestReviewUsecase_GetByUsername(t *testing.T) {
	ctx := context.Background()
	username := "testuser"

	t.Run("正常系: ユーザーのレビュー一覧を取得", func(t *testing.T) {
		now := time.Now()
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUsernameFn: func(_ context.Context, _ string, _, _ int) ([]repository.ReviewWithDetailsRow, int, error) {
					return []repository.ReviewWithDetailsRow{
						{
							ID: uuid.New(), Rating: 4, EpisodeID: uuid.New(), EpisodeTitle: "Ep1",
							PodcastID: uuid.New(), PodcastTitle: "Podcast1",
							CreatedAt: now, UpdatedAt: now,
						},
					}, 1, nil
				},
			},
			&mockEpisodeRepo{},
			&mockUserRepo{
				getByUsernameFunc: func(_ context.Context, _ string) (*model.User, error) {
					return &model.User{ID: uuid.New(), Username: username}, nil
				},
			},
		)

		result, err := uc.GetByUsername(ctx, username, 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Reviews) != 1 {
			t.Errorf("reviews count = %d, want 1", len(result.Reviews))
		}
		if result.Total != 1 {
			t.Errorf("total = %d, want 1", result.Total)
		}
		if result.Reviews[0].Rating != 4 {
			t.Errorf("rating = %d, want 4", result.Reviews[0].Rating)
		}
		if result.Reviews[0].UpdatedAt == "" {
			t.Error("expected updated_at to be set")
		}
	})

	t.Run("ユーザーが存在しない → NotFoundError", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{},
			&mockEpisodeRepo{},
			&mockUserRepo{
				getByUsernameFunc: func(_ context.Context, _ string) (*model.User, error) {
					return nil, nil // ユーザーが見つからない
				},
			},
		)

		_, err := uc.GetByUsername(ctx, "nonexistent", 20, 0)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
	})

	t.Run("レビューが空 → 空のリストを返す", func(t *testing.T) {
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUsernameFn: func(_ context.Context, _ string, _, _ int) ([]repository.ReviewWithDetailsRow, int, error) {
					return []repository.ReviewWithDetailsRow{}, 0, nil
				},
			},
			&mockEpisodeRepo{},
			&mockUserRepo{
				getByUsernameFunc: func(_ context.Context, _ string) (*model.User, error) {
					return &model.User{ID: uuid.New(), Username: username}, nil
				},
			},
		)

		result, err := uc.GetByUsername(ctx, username, 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Reviews) != 0 {
			t.Errorf("reviews count = %d, want 0", len(result.Reviews))
		}
		if result.Total != 0 {
			t.Errorf("total = %d, want 0", result.Total)
		}
	})

	t.Run("limit/offset の補正", func(t *testing.T) {
		var capturedLimit, capturedOffset int
		uc := NewReviewUsecase(
			&mockReviewRepo{
				getByUsernameFn: func(_ context.Context, _ string, limit, offset int) ([]repository.ReviewWithDetailsRow, int, error) {
					capturedLimit = limit
					capturedOffset = offset
					return nil, 0, nil
				},
			},
			&mockEpisodeRepo{},
			&mockUserRepo{
				getByUsernameFunc: func(_ context.Context, _ string) (*model.User, error) {
					return &model.User{ID: uuid.New(), Username: username}, nil
				},
			},
		)

		// limit が負 → 20 に補正、offset が負 → 0 に補正
		_, err := uc.GetByUsername(ctx, username, -1, -5)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if capturedLimit != 20 {
			t.Errorf("corrected limit = %d, want 20", capturedLimit)
		}
		if capturedOffset != 0 {
			t.Errorf("corrected offset = %d, want 0", capturedOffset)
		}
	})
}
