package itunes

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestLookupByID_Success は正常系のテストです。
// httptest.NewServer でモック HTTP サーバーを立てて、
// iTunes Lookup API のレスポンスをシミュレートします。
func TestLookupByID_Success(t *testing.T) {
	// モックサーバーを作成
	// iTunes API のレスポンスを模倣した JSON を返す
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// リクエストパスの確認
		if r.URL.Path != "/lookup" {
			t.Errorf("path = %q, want /lookup", r.URL.Path)
		}
		// クエリパラメータの確認
		if id := r.URL.Query().Get("id"); id != "12345" {
			t.Errorf("id = %q, want 12345", id)
		}

		resp := SearchResponse{
			ResultCount: 1,
			Results: []SearchResult{
				{
					CollectionID:   12345,
					CollectionName: "テスト番組",
					ArtistName:     "テスト配信者",
					PrimaryGenre:   "Comedy",
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			t.Errorf("failed to encode response: %v", err)
			http.Error(w, "encode error", http.StatusInternalServerError)
			return
		}
	}))
	defer server.Close()

	// Client の baseURL をモックサーバーに差し替え
	client := NewClient()
	client.SetBaseURL(server.URL)

	result, err := client.LookupByID(context.Background(), 12345)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.PrimaryGenre != "Comedy" {
		t.Errorf("PrimaryGenre = %q, want %q", result.PrimaryGenre, "Comedy")
	}
	if result.CollectionName != "テスト番組" {
		t.Errorf("CollectionName = %q, want %q", result.CollectionName, "テスト番組")
	}
}

// TestLookupByID_NotFound は iTunes API で見つからなかった場合のテストです。
// resultCount=0 のレスポンスを返して、nil が返ることを確認します。
func TestLookupByID_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := SearchResponse{
			ResultCount: 0,
			Results:     []SearchResult{},
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			t.Errorf("failed to encode response: %v", err)
			http.Error(w, "encode error", http.StatusInternalServerError)
			return
		}
	}))
	defer server.Close()

	client := NewClient()
	client.SetBaseURL(server.URL)

	result, err := client.LookupByID(context.Background(), 99999)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != nil {
		t.Errorf("expected nil, got %+v", result)
	}
}

// TestLookupByID_ServerError は iTunes API がエラーを返した場合のテストです。
func TestLookupByID_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewClient()
	client.SetBaseURL(server.URL)

	_, err := client.LookupByID(context.Background(), 12345)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// TestSearchPodcasts_Success は SearchPodcasts の正常系テストです。
func TestSearchPodcasts_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/search" {
			t.Errorf("path = %q, want /search", r.URL.Path)
		}

		resp := SearchResponse{
			ResultCount: 1,
			Results: []SearchResult{
				{
					CollectionID:   12345,
					CollectionName: "テスト番組",
					ArtistName:     "テスト配信者",
					PrimaryGenre:   "News",
					FeedURL:        "https://example.com/feed.xml",
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			t.Errorf("failed to encode response: %v", err)
			http.Error(w, "encode error", http.StatusInternalServerError)
			return
		}
	}))
	defer server.Close()

	client := NewClient()
	client.SetBaseURL(server.URL)

	results, err := client.SearchPodcasts(context.Background(), "テスト", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("results count = %d, want 1", len(results))
	}
	if results[0].PrimaryGenre != "News" {
		t.Errorf("PrimaryGenre = %q, want %q", results[0].PrimaryGenre, "News")
	}
}
