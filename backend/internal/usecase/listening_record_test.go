package usecase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/model"
	"github.com/kobayashikosei/podlog/backend/internal/repository"
)

// ── モックリポジトリ ──

// mockListeningRecordRepo は ListeningRecordRepository のモック実装です。
type mockListeningRecordRepo struct {
	createFn              func(ctx context.Context, record *model.ListeningRecord) error
	deleteFn              func(ctx context.Context, userID, episodeID uuid.UUID) error
	getByUserAndEpisodeFn func(ctx context.Context, userID, episodeID uuid.UUID) (*model.ListeningRecord, error)
	getByUserIDFn         func(ctx context.Context, userID uuid.UUID, limit, offset int) ([]repository.ListeningRecordRow, int, error)
	getByUsernameFn       func(ctx context.Context, username string, limit, offset int) ([]repository.ListeningRecordRow, int, error)
}

func (m *mockListeningRecordRepo) Create(ctx context.Context, record *model.ListeningRecord) error {
	if m.createFn == nil {
		return fmt.Errorf("mockListeningRecordRepo.Create: not implemented")
	}
	return m.createFn(ctx, record)
}
func (m *mockListeningRecordRepo) Delete(ctx context.Context, userID, episodeID uuid.UUID) error {
	if m.deleteFn == nil {
		return fmt.Errorf("mockListeningRecordRepo.Delete: not implemented")
	}
	return m.deleteFn(ctx, userID, episodeID)
}
func (m *mockListeningRecordRepo) GetByUserAndEpisode(ctx context.Context, userID, episodeID uuid.UUID) (*model.ListeningRecord, error) {
	if m.getByUserAndEpisodeFn == nil {
		return nil, fmt.Errorf("mockListeningRecordRepo.GetByUserAndEpisode: not implemented")
	}
	return m.getByUserAndEpisodeFn(ctx, userID, episodeID)
}
func (m *mockListeningRecordRepo) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]repository.ListeningRecordRow, int, error) {
	if m.getByUserIDFn == nil {
		return nil, 0, fmt.Errorf("mockListeningRecordRepo.GetByUserID: not implemented")
	}
	return m.getByUserIDFn(ctx, userID, limit, offset)
}
func (m *mockListeningRecordRepo) GetByUsername(ctx context.Context, username string, limit, offset int) ([]repository.ListeningRecordRow, int, error) {
	if m.getByUsernameFn == nil {
		return nil, 0, fmt.Errorf("mockListeningRecordRepo.GetByUsername: not implemented")
	}
	return m.getByUsernameFn(ctx, username, limit, offset)
}

// ── テスト: Create ──

func TestListeningRecordUsecase_Create(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episode := newTestEpisode()

	t.Run("正常系: 聴取記録作成成功", func(t *testing.T) {
		created := newTestRecord(userID, episode.ID)
		callCount := 0

		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.ListeningRecord, error) {
					callCount++
					if callCount == 1 {
						return nil, nil // 重複なし
					}
					return created, nil // 再取得
				},
				createFn: func(_ context.Context, _ *model.ListeningRecord) error {
					return nil
				},
			},
			&mockEpisodeRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.Episode, error) {
					return episode, nil
				},
			},
			nil, // userRepo は Create では使わない
		)

		result, err := uc.Create(ctx, userID, episode.ID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.CreatedAt.IsZero() {
			t.Error("created_at should not be zero")
		}
	})

	t.Run("エピソードが存在しない → NotFoundError", func(t *testing.T) {
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{},
			&mockEpisodeRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.Episode, error) {
					return nil, nil
				},
			},
			nil,
		)

		_, err := uc.Create(ctx, userID, uuid.New())
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T: %v", err, err)
		}
	})

	t.Run("重複登録 → ConflictError", func(t *testing.T) {
		existing := newTestRecord(userID, episode.ID)
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.ListeningRecord, error) {
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

		_, err := uc.Create(ctx, userID, episode.ID)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ce *ConflictError
		if !errors.As(err, &ce) {
			t.Fatalf("expected ConflictError, got %T: %v", err, err)
		}
	})

	t.Run("UNIQUE制約違反 → ConflictError（並行リクエスト）", func(t *testing.T) {
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.ListeningRecord, error) {
					return nil, nil // 重複なし（事前チェック通過）
				},
				createFn: func(_ context.Context, _ *model.ListeningRecord) error {
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

		_, err := uc.Create(ctx, userID, episode.ID)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ce *ConflictError
		if !errors.As(err, &ce) {
			t.Fatalf("expected ConflictError, got %T: %v", err, err)
		}
	})
}

// ── テスト: Delete ──

func TestListeningRecordUsecase_Delete(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episodeID := uuid.New()

	t.Run("正常系: 削除成功", func(t *testing.T) {
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
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

	t.Run("存在しないレコード → NotFoundError", func(t *testing.T) {
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
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

// ── テスト: GetStatus ──

func TestListeningRecordUsecase_GetStatus(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episodeID := uuid.New()

	t.Run("聴取済み → listened=true", func(t *testing.T) {
		record := newTestRecord(userID, episodeID)
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.ListeningRecord, error) {
					return record, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		listened, rec, err := uc.GetStatus(ctx, userID, episodeID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !listened {
			t.Error("expected listened=true")
		}
		if rec == nil {
			t.Error("expected record, got nil")
		}
	})

	t.Run("未聴取 → listened=false", func(t *testing.T) {
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
				getByUserAndEpisodeFn: func(_ context.Context, _, _ uuid.UUID) (*model.ListeningRecord, error) {
					return nil, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		listened, rec, err := uc.GetStatus(ctx, userID, episodeID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if listened {
			t.Error("expected listened=false")
		}
		if rec != nil {
			t.Error("expected nil record")
		}
	})
}

// ── テスト: GetByUserID ──

func TestListeningRecordUsecase_GetByUserID(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	t.Run("正常系: 一覧取得", func(t *testing.T) {
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
				getByUserIDFn: func(_ context.Context, _ uuid.UUID, limit, offset int) ([]repository.ListeningRecordRow, int, error) {
					return []repository.ListeningRecordRow{
						{
							ID: uuid.New(), EpisodeID: uuid.New(), EpisodeTitle: "Ep1",
							PodcastID: uuid.New(), PodcastTitle: "Podcast1", CreatedAt: time.Now(),
						},
					}, 1, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		result, err := uc.GetByUserID(ctx, userID, 20, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Records) != 1 {
			t.Errorf("records count = %d, want 1", len(result.Records))
		}
		if result.Total != 1 {
			t.Errorf("total = %d, want 1", result.Total)
		}
	})

	t.Run("limit/offset の補正", func(t *testing.T) {
		var capturedLimit, capturedOffset int
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
				getByUserIDFn: func(_ context.Context, _ uuid.UUID, limit, offset int) ([]repository.ListeningRecordRow, int, error) {
					capturedLimit = limit
					capturedOffset = offset
					return nil, 0, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		// limit が負 → 20 に補正、offset が負 → 0 に補正
		_, err := uc.GetByUserID(ctx, userID, -1, -5)
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
		_, err = uc.GetByUserID(ctx, userID, 150, 0)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if capturedLimit != 20 {
			t.Errorf("corrected limit = %d, want 20", capturedLimit)
		}
	})
}

// ── テスト: GetByUsername ──

func TestListeningRecordUsecase_GetByUsername(t *testing.T) {
	ctx := context.Background()
	username := "testuser"

	t.Run("正常系: ユーザーの聴取履歴を取得", func(t *testing.T) {
		podcastID := uuid.New()
		publishedAt := time.Now()

		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
				getByUsernameFn: func(_ context.Context, _ string, _, _ int) ([]repository.ListeningRecordRow, int, error) {
					return []repository.ListeningRecordRow{
						{
							ID: uuid.New(), EpisodeID: uuid.New(), EpisodeTitle: "Ep1",
							PodcastID: podcastID, PodcastTitle: "Podcast1",
							PublishedAt: &publishedAt, CreatedAt: time.Now(),
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
		if len(result.Records) != 1 {
			t.Errorf("records count = %d, want 1", len(result.Records))
		}
		if result.Total != 1 {
			t.Errorf("total = %d, want 1", result.Total)
		}
		if result.Records[0].Episode.PublishedAt == nil {
			t.Error("expected published_at to be set")
		}
	})

	t.Run("ユーザーが存在しない → NotFoundError", func(t *testing.T) {
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{},
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

	t.Run("聴取履歴が空 → 空のリストを返す", func(t *testing.T) {
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
				getByUsernameFn: func(_ context.Context, _ string, _, _ int) ([]repository.ListeningRecordRow, int, error) {
					return []repository.ListeningRecordRow{}, 0, nil
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
		if len(result.Records) != 0 {
			t.Errorf("records count = %d, want 0", len(result.Records))
		}
		if result.Total != 0 {
			t.Errorf("total = %d, want 0", result.Total)
		}
	})

	t.Run("limit/offset の補正", func(t *testing.T) {
		var capturedLimit, capturedOffset int
		uc := NewListeningRecordUsecase(
			&mockListeningRecordRepo{
				getByUsernameFn: func(_ context.Context, _ string, limit, offset int) ([]repository.ListeningRecordRow, int, error) {
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
