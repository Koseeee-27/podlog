package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/Koseeee-27/podlog/backend/internal/usecase"
)

// ── モックユースケース（Sitemap ハンドラーテスト用） ──

// mockSitemapUsecase は usecase.SitemapUsecase のモック実装です。
// ハンドラーの動作（成功 → 200、失敗 → 500）を切り替えるため、各メソッドで Fn を差し替えます。
type mockSitemapUsecase struct {
	getPodcastsFn func(ctx context.Context) (*usecase.SitemapPodcastsResult, error)
	getEpisodesFn func(ctx context.Context) (*usecase.SitemapEpisodesResult, error)
	getUsersFn    func(ctx context.Context) (*usecase.SitemapUsersResult, error)
}

func (m *mockSitemapUsecase) GetPodcasts(ctx context.Context) (*usecase.SitemapPodcastsResult, error) {
	return m.getPodcastsFn(ctx)
}

func (m *mockSitemapUsecase) GetEpisodes(ctx context.Context) (*usecase.SitemapEpisodesResult, error) {
	return m.getEpisodesFn(ctx)
}

func (m *mockSitemapUsecase) GetUsers(ctx context.Context) (*usecase.SitemapUsersResult, error) {
	return m.getUsersFn(ctx)
}

// newSitemapTestContext はハンドラーテスト用の Echo Context / Recorder を生成するヘルパーです。
func newSitemapTestContext(t *testing.T, path string) (echo.Context, *httptest.ResponseRecorder) {
	t.Helper()
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	return c, rec
}

// ── テスト: GetPodcasts ──

func TestSitemapHandler_GetPodcasts(t *testing.T) {
	t.Run("正常系: 200 OK と items 配列を返す", func(t *testing.T) {
		id := uuid.New()
		uc := &mockSitemapUsecase{
			getPodcastsFn: func(_ context.Context) (*usecase.SitemapPodcastsResult, error) {
				return &usecase.SitemapPodcastsResult{
					Items: []usecase.SitemapPodcastItem{
						{ID: id, UpdatedAt: "2026-04-01T00:00:00Z"},
					},
				}, nil
			},
		}

		h := NewSitemapHandler(uc)
		c, rec := newSitemapTestContext(t, "/api/v1/sitemap/podcasts")

		if err := h.GetPodcasts(c); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.Code != http.StatusOK {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
		}

		var body usecase.SitemapPodcastsResult
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatalf("failed to parse body: %v", err)
		}
		if len(body.Items) != 1 {
			t.Fatalf("items count = %d, want 1", len(body.Items))
		}
		if body.Items[0].ID != id {
			t.Errorf("items[0].id = %v, want %v", body.Items[0].ID, id)
		}
	})

	t.Run("usecase エラー → 500 Internal Server Error", func(t *testing.T) {
		uc := &mockSitemapUsecase{
			getPodcastsFn: func(_ context.Context) (*usecase.SitemapPodcastsResult, error) {
				return nil, errors.New("db down")
			},
		}

		h := NewSitemapHandler(uc)
		c, rec := newSitemapTestContext(t, "/api/v1/sitemap/podcasts")

		if err := h.GetPodcasts(c); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.Code != http.StatusInternalServerError {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
		}

		var body map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatalf("failed to parse body: %v", err)
		}
		if body["error"] == "" {
			t.Error("error field is empty")
		}
	})
}

// ── テスト: GetEpisodes ──

func TestSitemapHandler_GetEpisodes(t *testing.T) {
	t.Run("正常系: 200 OK と items 配列を返す", func(t *testing.T) {
		id := uuid.New()
		uc := &mockSitemapUsecase{
			getEpisodesFn: func(_ context.Context) (*usecase.SitemapEpisodesResult, error) {
				return &usecase.SitemapEpisodesResult{
					Items: []usecase.SitemapEpisodeItem{
						{ID: id, UpdatedAt: "2026-04-01T00:00:00Z"},
					},
				}, nil
			},
		}

		h := NewSitemapHandler(uc)
		c, rec := newSitemapTestContext(t, "/api/v1/sitemap/episodes")

		if err := h.GetEpisodes(c); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.Code != http.StatusOK {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
		}

		var body usecase.SitemapEpisodesResult
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatalf("failed to parse body: %v", err)
		}
		if len(body.Items) != 1 {
			t.Fatalf("items count = %d, want 1", len(body.Items))
		}
		if body.Items[0].ID != id {
			t.Errorf("items[0].id = %v, want %v", body.Items[0].ID, id)
		}
	})

	t.Run("usecase エラー → 500 Internal Server Error", func(t *testing.T) {
		uc := &mockSitemapUsecase{
			getEpisodesFn: func(_ context.Context) (*usecase.SitemapEpisodesResult, error) {
				return nil, errors.New("db down")
			},
		}

		h := NewSitemapHandler(uc)
		c, rec := newSitemapTestContext(t, "/api/v1/sitemap/episodes")

		if err := h.GetEpisodes(c); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.Code != http.StatusInternalServerError {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
		}
	})
}

// ── テスト: GetUsers ──

func TestSitemapHandler_GetUsers(t *testing.T) {
	t.Run("正常系: 200 OK と items 配列を返す", func(t *testing.T) {
		uc := &mockSitemapUsecase{
			getUsersFn: func(_ context.Context) (*usecase.SitemapUsersResult, error) {
				return &usecase.SitemapUsersResult{
					Items: []usecase.SitemapUserItem{
						{Username: "alice", UpdatedAt: "2026-04-01T00:00:00Z"},
					},
				}, nil
			},
		}

		h := NewSitemapHandler(uc)
		c, rec := newSitemapTestContext(t, "/api/v1/sitemap/users")

		if err := h.GetUsers(c); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.Code != http.StatusOK {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
		}

		var body usecase.SitemapUsersResult
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatalf("failed to parse body: %v", err)
		}
		if len(body.Items) != 1 {
			t.Fatalf("items count = %d, want 1", len(body.Items))
		}
		if body.Items[0].Username != "alice" {
			t.Errorf("items[0].username = %q, want %q", body.Items[0].Username, "alice")
		}
	})

	t.Run("usecase エラー → 500 Internal Server Error", func(t *testing.T) {
		uc := &mockSitemapUsecase{
			getUsersFn: func(_ context.Context) (*usecase.SitemapUsersResult, error) {
				return nil, errors.New("db down")
			},
		}

		h := NewSitemapHandler(uc)
		c, rec := newSitemapTestContext(t, "/api/v1/sitemap/users")

		if err := h.GetUsers(c); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if rec.Code != http.StatusInternalServerError {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
		}
	})
}
