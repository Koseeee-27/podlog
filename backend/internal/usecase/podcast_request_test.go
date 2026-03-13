package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/model"
)

// ── モックリポジトリ ──

// mockPodcastRequestRepo は PodcastRequestRepository のモック実装です。
// テストケースごとに createFn を差し替えて、DB の振る舞いをシミュレートします。
type mockPodcastRequestRepo struct {
	createFn func(ctx context.Context, req *model.PodcastRequest) error
}

func (m *mockPodcastRequestRepo) Create(ctx context.Context, req *model.PodcastRequest) error {
	if m.createFn == nil {
		return fmt.Errorf("mockPodcastRequestRepo.Create: not implemented")
	}
	return m.createFn(ctx, req)
}

// ── テスト: Create ──

func TestPodcastRequestUsecase_Create(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	t.Run("正常系: title のみでリクエスト作成成功", func(t *testing.T) {
		uc := NewPodcastRequestUsecase(
			&mockPodcastRequestRepo{
				createFn: func(_ context.Context, req *model.PodcastRequest) error {
					// DB に渡されるデータを検証
					if req.Title != "テスト番組" {
						t.Errorf("title = %q, want %q", req.Title, "テスト番組")
					}
					if req.URL != nil {
						t.Errorf("url = %v, want nil", req.URL)
					}
					if req.Status != "pending" {
						t.Errorf("status = %q, want %q", req.Status, "pending")
					}
					if req.UserID != userID {
						t.Errorf("user_id = %v, want %v", req.UserID, userID)
					}
					return nil
				},
			},
		)

		result, err := uc.Create(ctx, userID, CreatePodcastRequestInput{
			Title: "テスト番組",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Title != "テスト番組" {
			t.Errorf("title = %q, want %q", result.Title, "テスト番組")
		}
		if result.Status != "pending" {
			t.Errorf("status = %q, want %q", result.Status, "pending")
		}
		if result.URL != nil {
			t.Errorf("url = %v, want nil", result.URL)
		}
		if result.ID == uuid.Nil {
			t.Error("id should not be nil UUID")
		}
	})

	t.Run("正常系: title + url でリクエスト作成成功", func(t *testing.T) {
		testURL := "https://podcasts.apple.com/jp/podcast/test"

		uc := NewPodcastRequestUsecase(
			&mockPodcastRequestRepo{
				createFn: func(_ context.Context, req *model.PodcastRequest) error {
					if req.URL == nil || *req.URL != testURL {
						t.Errorf("url = %v, want %q", req.URL, testURL)
					}
					return nil
				},
			},
		)

		result, err := uc.Create(ctx, userID, CreatePodcastRequestInput{
			Title: "テスト番組",
			URL:   &testURL,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.URL == nil || *result.URL != testURL {
			t.Errorf("url = %v, want %q", result.URL, testURL)
		}
	})

	t.Run("正常系: url が空文字の場合は nil として扱われる", func(t *testing.T) {
		emptyURL := "   "

		uc := NewPodcastRequestUsecase(
			&mockPodcastRequestRepo{
				createFn: func(_ context.Context, req *model.PodcastRequest) error {
					if req.URL != nil {
						t.Errorf("url = %v, want nil (empty string should be treated as nil)", req.URL)
					}
					return nil
				},
			},
		)

		result, err := uc.Create(ctx, userID, CreatePodcastRequestInput{
			Title: "テスト番組",
			URL:   &emptyURL,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.URL != nil {
			t.Errorf("url = %v, want nil", result.URL)
		}
	})

	t.Run("title が空 → ValidationError", func(t *testing.T) {
		uc := NewPodcastRequestUsecase(&mockPodcastRequestRepo{})

		_, err := uc.Create(ctx, userID, CreatePodcastRequestInput{
			Title: "",
		})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
	})

	t.Run("title が空白のみ → ValidationError", func(t *testing.T) {
		uc := NewPodcastRequestUsecase(&mockPodcastRequestRepo{})

		_, err := uc.Create(ctx, userID, CreatePodcastRequestInput{
			Title: "   ",
		})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
	})

	t.Run("title が501文字 → ValidationError", func(t *testing.T) {
		uc := NewPodcastRequestUsecase(&mockPodcastRequestRepo{})

		longTitle := strings.Repeat("a", 501)
		_, err := uc.Create(ctx, userID, CreatePodcastRequestInput{
			Title: longTitle,
		})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
	})

	t.Run("title がちょうど500文字 → 正常", func(t *testing.T) {
		uc := NewPodcastRequestUsecase(
			&mockPodcastRequestRepo{
				createFn: func(_ context.Context, _ *model.PodcastRequest) error {
					return nil
				},
			},
		)

		title500 := strings.Repeat("a", 500)
		result, err := uc.Create(ctx, userID, CreatePodcastRequestInput{
			Title: title500,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(result.Title) != 500 {
			t.Errorf("title length = %d, want 500", len(result.Title))
		}
	})

	t.Run("url が不正な形式 → ValidationError", func(t *testing.T) {
		uc := NewPodcastRequestUsecase(&mockPodcastRequestRepo{})

		invalidURL := "not-a-url"
		_, err := uc.Create(ctx, userID, CreatePodcastRequestInput{
			Title: "テスト番組",
			URL:   &invalidURL,
		})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
	})

	t.Run("url が ftp スキーム → ValidationError", func(t *testing.T) {
		uc := NewPodcastRequestUsecase(&mockPodcastRequestRepo{})

		ftpURL := "ftp://example.com/podcast"
		_, err := uc.Create(ctx, userID, CreatePodcastRequestInput{
			Title: "テスト番組",
			URL:   &ftpURL,
		})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Fatalf("expected ValidationError, got %T: %v", err, err)
		}
	})

	t.Run("DB エラー → エラー伝播", func(t *testing.T) {
		uc := NewPodcastRequestUsecase(
			&mockPodcastRequestRepo{
				createFn: func(_ context.Context, _ *model.PodcastRequest) error {
					return fmt.Errorf("database connection error")
				},
			},
		)

		_, err := uc.Create(ctx, userID, CreatePodcastRequestInput{
			Title: "テスト番組",
		})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		// ValidationError ではなく一般的なエラーであること
		var ve *ValidationError
		if errors.As(err, &ve) {
			t.Fatal("expected general error, not ValidationError")
		}
	})
}

// ── テスト: validatePodcastRequestInput ──

func TestValidatePodcastRequestInput(t *testing.T) {
	t.Run("正常な入力", func(t *testing.T) {
		url := "https://podcasts.apple.com/jp/podcast/test"
		err := validatePodcastRequestInput(CreatePodcastRequestInput{
			Title: "テスト番組",
			URL:   &url,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("http スキームも許可", func(t *testing.T) {
		url := "http://example.com/podcast"
		err := validatePodcastRequestInput(CreatePodcastRequestInput{
			Title: "テスト番組",
			URL:   &url,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("url が nil は正常", func(t *testing.T) {
		err := validatePodcastRequestInput(CreatePodcastRequestInput{
			Title: "テスト番組",
			URL:   nil,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}
