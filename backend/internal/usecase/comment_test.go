package usecase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// ── モックリポジトリ ──

// mockCommentRepo は CommentRepository のモック実装です。
// rating モックと同じく、関数フィールドを差し替える流儀。
type mockCommentRepo struct {
	createFn           func(ctx context.Context, comment *model.Comment) error
	updateFn           func(ctx context.Context, commentID uuid.UUID, body string) error
	deleteFn           func(ctx context.Context, commentID uuid.UUID) error
	getByIDFn          func(ctx context.Context, commentID uuid.UUID) (*model.Comment, error)
	getByEpisodeIDFn   func(ctx context.Context, episodeID uuid.UUID, limit, offset int) ([]repository.CommentWithUserRow, int, error)
	getByUserIDFn      func(ctx context.Context, userID uuid.UUID, limit, offset int) ([]repository.CommentWithDetailsRow, int, error)
	getByUsernameFn    func(ctx context.Context, username string, limit, offset int) ([]repository.CommentWithDetailsRow, int, error)
	countByEpisodeIDFn func(ctx context.Context, episodeID uuid.UUID) (int, error)
	getTimelineFn      func(ctx context.Context, limit, offset int) ([]repository.CommentTimelineRow, int, error)
}

func (m *mockCommentRepo) Create(ctx context.Context, comment *model.Comment) error {
	if m.createFn == nil {
		return fmt.Errorf("mockCommentRepo.Create: not implemented")
	}
	return m.createFn(ctx, comment)
}
func (m *mockCommentRepo) Update(ctx context.Context, commentID uuid.UUID, body string) error {
	if m.updateFn == nil {
		return fmt.Errorf("mockCommentRepo.Update: not implemented")
	}
	return m.updateFn(ctx, commentID, body)
}
func (m *mockCommentRepo) Delete(ctx context.Context, commentID uuid.UUID) error {
	if m.deleteFn == nil {
		return fmt.Errorf("mockCommentRepo.Delete: not implemented")
	}
	return m.deleteFn(ctx, commentID)
}
func (m *mockCommentRepo) GetByID(ctx context.Context, commentID uuid.UUID) (*model.Comment, error) {
	if m.getByIDFn == nil {
		return nil, fmt.Errorf("mockCommentRepo.GetByID: not implemented")
	}
	return m.getByIDFn(ctx, commentID)
}
func (m *mockCommentRepo) GetByEpisodeID(ctx context.Context, episodeID uuid.UUID, limit, offset int) ([]repository.CommentWithUserRow, int, error) {
	if m.getByEpisodeIDFn == nil {
		return nil, 0, fmt.Errorf("mockCommentRepo.GetByEpisodeID: not implemented")
	}
	return m.getByEpisodeIDFn(ctx, episodeID, limit, offset)
}
func (m *mockCommentRepo) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]repository.CommentWithDetailsRow, int, error) {
	if m.getByUserIDFn == nil {
		return nil, 0, fmt.Errorf("mockCommentRepo.GetByUserID: not implemented")
	}
	return m.getByUserIDFn(ctx, userID, limit, offset)
}
func (m *mockCommentRepo) GetByUsername(ctx context.Context, username string, limit, offset int) ([]repository.CommentWithDetailsRow, int, error) {
	if m.getByUsernameFn == nil {
		return nil, 0, fmt.Errorf("mockCommentRepo.GetByUsername: not implemented")
	}
	return m.getByUsernameFn(ctx, username, limit, offset)
}
func (m *mockCommentRepo) CountByEpisodeID(ctx context.Context, episodeID uuid.UUID) (int, error) {
	if m.countByEpisodeIDFn == nil {
		return 0, fmt.Errorf("mockCommentRepo.CountByEpisodeID: not implemented")
	}
	return m.countByEpisodeIDFn(ctx, episodeID)
}
func (m *mockCommentRepo) GetTimeline(ctx context.Context, limit, offset int) ([]repository.CommentTimelineRow, int, error) {
	if m.getTimelineFn == nil {
		return nil, 0, fmt.Errorf("mockCommentRepo.GetTimeline: not implemented")
	}
	return m.getTimelineFn(ctx, limit, offset)
}

// newTestComment はテスト用の感想を生成します。
func newTestComment(userID, episodeID uuid.UUID) *model.Comment {
	now := time.Now()
	return &model.Comment{
		ID:        uuid.New(),
		UserID:    userID,
		EpisodeID: episodeID,
		Body:      "神回だった",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// ── テスト: バリデーション ──

func TestValidateCommentBody(t *testing.T) {
	t.Run("空文字列はエラー", func(t *testing.T) {
		_, err := validateCommentBody("")
		if err == nil {
			t.Fatal("expected validation error")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T", err)
		}
	})

	t.Run("空白のみはエラー（trim 後に空文字）", func(t *testing.T) {
		if _, err := validateCommentBody("   　 　 "); err == nil {
			t.Fatal("expected validation error")
		}
	})

	t.Run("trim される", func(t *testing.T) {
		body, err := validateCommentBody("  hello  ")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if body != "hello" {
			t.Errorf("body = %q, want %q", body, "hello")
		}
	})

	t.Run("1000 文字（コードポイント）はちょうど上限で OK", func(t *testing.T) {
		body := strings.Repeat("あ", 1000) // マルチバイト 1000 字（バイト数では 3000）
		got, err := validateCommentBody(body)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != body {
			t.Error("body should be returned as-is")
		}
	})

	t.Run("1001 文字はエラー", func(t *testing.T) {
		body := strings.Repeat("a", 1001)
		if _, err := validateCommentBody(body); err == nil {
			t.Fatal("expected validation error for 1001 chars")
		}
	})

	t.Run("NULL バイトを含む本文はエラー（PG の UTF8 制約で 500 になるのを防ぐ）", func(t *testing.T) {
		// PostgreSQL の TEXT/VARCHAR は NUL byte を保存できず
		// "invalid byte sequence for encoding UTF8: 0x00" で 500 になる。
		// usecase 層で 400 として弾く。
		body := "hello\x00world"
		_, err := validateCommentBody(body)
		if err == nil {
			t.Fatal("expected validation error for null-byte body")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T", err)
		}
	})
}

// ── テスト: Create ──

func TestCommentUsecase_Create(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	episode := newTestEpisode()

	t.Run("正常系: 感想作成成功", func(t *testing.T) {
		var createdComment *model.Comment

		uc := NewCommentUsecase(
			&mockCommentRepo{
				createFn: func(_ context.Context, c *model.Comment) error {
					// 渡された値を保持しておき、GetByID で同じ値を返す
					now := time.Now()
					stored := *c
					stored.CreatedAt = now
					stored.UpdatedAt = now
					createdComment = &stored
					return nil
				},
				getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Comment, error) {
					return createdComment, nil
				},
			},
			&mockEpisodeRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.Episode, error) {
					return episode, nil
				},
			},
			nil,
		)

		got, err := uc.Create(ctx, userID, episode.ID, CreateCommentInput{Body: "神回だった！  "})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got.Body != "神回だった！" {
			t.Errorf("body = %q (want trimmed)", got.Body)
		}
		if got.UserID != userID {
			t.Errorf("user_id mismatch")
		}
		if got.EpisodeID != episode.ID {
			t.Errorf("episode_id mismatch")
		}
		if got.CreatedAt.IsZero() {
			t.Error("created_at should not be zero")
		}
	})

	t.Run("空本文 → ValidationError（DB に到達しない）", func(t *testing.T) {
		uc := NewCommentUsecase(&mockCommentRepo{}, &mockEpisodeRepo{}, nil)
		_, err := uc.Create(ctx, userID, episode.ID, CreateCommentInput{Body: "  "})
		if err == nil {
			t.Fatal("expected error")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T", err)
		}
	})

	t.Run("エピソード不存在 → NotFoundError", func(t *testing.T) {
		uc := NewCommentUsecase(
			&mockCommentRepo{},
			&mockEpisodeRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.Episode, error) {
					return nil, nil
				},
			},
			nil,
		)
		_, err := uc.Create(ctx, userID, uuid.New(), CreateCommentInput{Body: "ok"})
		if err == nil {
			t.Fatal("expected error")
		}
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T", err)
		}
	})

	t.Run("複数件投稿可（rating の Create のような重複チェックがないこと）", func(t *testing.T) {
		// 同一ユーザーが同じエピソードに 2 回投稿しても OK
		callCount := 0
		var lastID uuid.UUID
		uc := NewCommentUsecase(
			&mockCommentRepo{
				createFn: func(_ context.Context, c *model.Comment) error {
					callCount++
					lastID = c.ID
					return nil
				},
				getByIDFn: func(_ context.Context, id uuid.UUID) (*model.Comment, error) {
					return &model.Comment{
						ID:        id,
						UserID:    userID,
						EpisodeID: episode.ID,
						Body:      "ok",
						CreatedAt: time.Now(),
						UpdatedAt: time.Now(),
					}, nil
				},
			},
			&mockEpisodeRepo{
				getByIDFunc: func(_ context.Context, _ uuid.UUID) (*model.Episode, error) {
					return episode, nil
				},
			},
			nil,
		)
		if _, err := uc.Create(ctx, userID, episode.ID, CreateCommentInput{Body: "1件目"}); err != nil {
			t.Fatalf("1st: %v", err)
		}
		if _, err := uc.Create(ctx, userID, episode.ID, CreateCommentInput{Body: "2件目"}); err != nil {
			t.Fatalf("2nd: %v", err)
		}
		if callCount != 2 {
			t.Errorf("Create should be called 2 times, got %d", callCount)
		}
		if lastID == uuid.Nil {
			t.Error("expected non-nil id")
		}
	})
}

// ── テスト: Update（403/404 区別が肝） ──

func TestCommentUsecase_Update(t *testing.T) {
	ctx := context.Background()
	owner := uuid.New()
	other := uuid.New()
	commentID := uuid.New()
	episodeID := uuid.New()

	t.Run("正常系: 自分のコメントを更新", func(t *testing.T) {
		callCount := 0
		uc := NewCommentUsecase(
			&mockCommentRepo{
				getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Comment, error) {
					callCount++
					// 1 回目: 所有者チェック用 / 2 回目: 更新後の再取得
					return &model.Comment{
						ID:        commentID,
						UserID:    owner,
						EpisodeID: episodeID,
						Body:      "updated body",
						CreatedAt: time.Now().Add(-time.Hour),
						UpdatedAt: time.Now(),
					}, nil
				},
				updateFn: func(_ context.Context, _ uuid.UUID, body string) error {
					if body != "updated body" {
						t.Errorf("body = %q, want updated body", body)
					}
					return nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		got, err := uc.Update(ctx, commentID, owner, UpdateCommentInput{Body: " updated body "})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got.Body != "updated body" {
			t.Errorf("body mismatch")
		}
		if callCount != 2 {
			t.Errorf("GetByID should be called 2 times, got %d", callCount)
		}
	})

	t.Run("他人のコメント → ForbiddenError（403）", func(t *testing.T) {
		uc := NewCommentUsecase(
			&mockCommentRepo{
				getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Comment, error) {
					return &model.Comment{
						ID:        commentID,
						UserID:    other, // 他人
						EpisodeID: episodeID,
						Body:      "...",
					}, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)

		_, err := uc.Update(ctx, commentID, owner, UpdateCommentInput{Body: "hack"})
		if err == nil {
			t.Fatal("expected ForbiddenError")
		}
		var fe *ForbiddenError
		if !errors.As(err, &fe) {
			t.Fatalf("expected ForbiddenError, got %T", err)
		}
		// NotFound にすり替わっていないことも確認（情報秘匿より仕様準拠を優先）
		var nfe *NotFoundError
		if errors.As(err, &nfe) {
			t.Fatal("should not be NotFoundError")
		}
	})

	t.Run("コメント不存在 → NotFoundError（404）", func(t *testing.T) {
		uc := NewCommentUsecase(
			&mockCommentRepo{
				getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Comment, error) {
					return nil, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)
		_, err := uc.Update(ctx, commentID, owner, UpdateCommentInput{Body: "x"})
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T", err)
		}
	})

	t.Run("並行 DELETE TOCTOU レース → 404 に揃える", func(t *testing.T) {
		uc := NewCommentUsecase(
			&mockCommentRepo{
				getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Comment, error) {
					return &model.Comment{ID: commentID, UserID: owner}, nil
				},
				updateFn: func(_ context.Context, _ uuid.UUID, _ string) error {
					return sql.ErrNoRows
				},
			},
			&mockEpisodeRepo{},
			nil,
		)
		_, err := uc.Update(ctx, commentID, owner, UpdateCommentInput{Body: "x"})
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError on race, got %T", err)
		}
	})

	t.Run("空本文 → ValidationError（DB に到達しない）", func(t *testing.T) {
		called := false
		uc := NewCommentUsecase(
			&mockCommentRepo{
				getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Comment, error) {
					called = true
					return nil, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)
		_, err := uc.Update(ctx, commentID, owner, UpdateCommentInput{Body: "  "})
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T", err)
		}
		if called {
			t.Error("GetByID should not be called when validation fails")
		}
	})
}

// ── テスト: Delete（403/404 区別が肝） ──

func TestCommentUsecase_Delete(t *testing.T) {
	ctx := context.Background()
	owner := uuid.New()
	other := uuid.New()
	commentID := uuid.New()

	t.Run("正常系: 自分のコメントを削除", func(t *testing.T) {
		deleted := false
		uc := NewCommentUsecase(
			&mockCommentRepo{
				getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Comment, error) {
					return &model.Comment{ID: commentID, UserID: owner}, nil
				},
				deleteFn: func(_ context.Context, _ uuid.UUID) error {
					deleted = true
					return nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)
		if err := uc.Delete(ctx, commentID, owner); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !deleted {
			t.Error("Delete should be called")
		}
	})

	t.Run("他人のコメント → ForbiddenError", func(t *testing.T) {
		uc := NewCommentUsecase(
			&mockCommentRepo{
				getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Comment, error) {
					return &model.Comment{ID: commentID, UserID: other}, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)
		err := uc.Delete(ctx, commentID, owner)
		var fe *ForbiddenError
		if !errors.As(err, &fe) {
			t.Fatalf("expected ForbiddenError, got %T", err)
		}
	})

	t.Run("コメント不存在 → NotFoundError", func(t *testing.T) {
		uc := NewCommentUsecase(
			&mockCommentRepo{
				getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Comment, error) {
					return nil, nil
				},
			},
			&mockEpisodeRepo{},
			nil,
		)
		err := uc.Delete(ctx, commentID, owner)
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T", err)
		}
	})

	t.Run("並行 DELETE TOCTOU → 404", func(t *testing.T) {
		uc := NewCommentUsecase(
			&mockCommentRepo{
				getByIDFn: func(_ context.Context, _ uuid.UUID) (*model.Comment, error) {
					return &model.Comment{ID: commentID, UserID: owner}, nil
				},
				deleteFn: func(_ context.Context, _ uuid.UUID) error {
					return sql.ErrNoRows
				},
			},
			&mockEpisodeRepo{},
			nil,
		)
		err := uc.Delete(ctx, commentID, owner)
		var nfe *NotFoundError
		if !errors.As(err, &nfe) {
			t.Fatalf("expected NotFoundError, got %T", err)
		}
	})
}

// ── テスト: 一覧取得系（pagination 正規化と total 透過） ──

func TestCommentUsecase_GetByEpisodeID_NormalizesPagination(t *testing.T) {
	ctx := context.Background()
	episodeID := uuid.New()

	gotLimit, gotOffset := 0, 0
	uc := NewCommentUsecase(
		&mockCommentRepo{
			getByEpisodeIDFn: func(_ context.Context, _ uuid.UUID, l, o int) ([]repository.CommentWithUserRow, int, error) {
				gotLimit, gotOffset = l, o
				return nil, 0, nil
			},
		},
		&mockEpisodeRepo{},
		nil,
	)

	// 不正値（負の limit, offset）はデフォルトに丸める
	if _, err := uc.GetByEpisodeID(ctx, episodeID, -10, -5); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotLimit != 20 || gotOffset != 0 {
		t.Errorf("normalized = (limit=%d, offset=%d), want (20, 0)", gotLimit, gotOffset)
	}
}

func TestCommentUsecase_GetTimeline_BuildsResult(t *testing.T) {
	ctx := context.Background()
	now := time.Now()
	uc := NewCommentUsecase(
		&mockCommentRepo{
			getTimelineFn: func(_ context.Context, _, _ int) ([]repository.CommentTimelineRow, int, error) {
				return []repository.CommentTimelineRow{
					{
						ID:           uuid.New(),
						Body:         "great",
						CreatedAt:    now,
						UpdatedAt:    now,
						UserID:       uuid.New(),
						UserUsername: "kosei",
						EpisodeID:    uuid.New(),
						EpisodeTitle: "ep",
						PodcastID:    uuid.New(),
						PodcastTitle: "pc",
					},
				}, 1, nil
			},
		},
		&mockEpisodeRepo{},
		nil,
	)
	got, err := uc.GetTimeline(ctx, 20, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Total != 1 {
		t.Errorf("total = %d, want 1", got.Total)
	}
	if len(got.Comments) != 1 {
		t.Fatalf("len(Comments) = %d, want 1", len(got.Comments))
	}
	if got.Comments[0].User.Username != "kosei" {
		t.Errorf("username mismatch")
	}
}

func TestCommentUsecase_GetByUsername_UserNotFound(t *testing.T) {
	ctx := context.Background()
	uc := NewCommentUsecase(
		&mockCommentRepo{},
		&mockEpisodeRepo{},
		&mockUserRepo{
			existsByUsernameFunc: func(_ context.Context, _ string) (bool, error) {
				return false, nil
			},
		},
	)
	_, err := uc.GetByUsername(ctx, "nobody", 20, 0)
	var nfe *NotFoundError
	if !errors.As(err, &nfe) {
		t.Fatalf("expected NotFoundError, got %T", err)
	}
}

// 警告のため未使用ヘルパーを参照する（ハーネステスト用に残す）。
// newTestComment は手動 fixture が必要になったときの足場。
var _ = newTestComment
