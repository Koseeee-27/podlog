package ogp

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// ── parseOGP テスト ──

func TestParseOGP_BasicHTML(t *testing.T) {
	htmlData := `<html><head>
		<meta property="og:title" content="テストタイトル" />
		<meta property="og:description" content="テスト説明" />
		<meta property="og:image" content="https://example.com/image.png" />
		<meta property="og:url" content="https://example.com" />
		<meta property="og:site_name" content="テストサイト" />
	</head><body></body></html>`

	data, err := parseOGP(strings.NewReader(htmlData))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if data.Title != "テストタイトル" {
		t.Errorf("expected title 'テストタイトル', got '%s'", data.Title)
	}
	if data.Description != "テスト説明" {
		t.Errorf("expected description 'テスト説明', got '%s'", data.Description)
	}
	if data.Image != "https://example.com/image.png" {
		t.Errorf("expected image URL, got '%s'", data.Image)
	}
	if data.URL != "https://example.com" {
		t.Errorf("expected URL, got '%s'", data.URL)
	}
	if data.SiteName != "テストサイト" {
		t.Errorf("expected site name 'テストサイト', got '%s'", data.SiteName)
	}
}

func TestParseOGP_EmptyHTML(t *testing.T) {
	data, err := parseOGP(strings.NewReader("<html><head></head></html>"))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if data.Title != "" {
		t.Errorf("expected empty title, got '%s'", data.Title)
	}
}

// ── SSRF 保護テスト ──

// TestFetch_HTTPURLBlocked は HTTP（非HTTPS）URLがブロックされることをテストします。
// Fetch メソッドはスキームが "https" でない場合に SSRFError を返す必要があります。
func TestFetch_HTTPURLBlocked(t *testing.T) {
	// httptest.NewServer は HTTP でリッスンするテストサーバーを作成
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("<html><head><meta property=\"og:title\" content=\"test\" /></head></html>"))
	}))
	defer ts.Close()

	scraper := NewScraper()
	_, err := scraper.Fetch(context.Background(), ts.URL) // http://... URL

	if err == nil {
		t.Fatal("expected error for HTTP URL, got nil")
	}

	// errors.Is で ErrSSRFBlocked が検出できること
	if !errors.Is(err, ErrSSRFBlocked) {
		t.Errorf("expected ErrSSRFBlocked, got %v", err)
	}

	// エラーメッセージに HTTPS に関する記述があること
	if !strings.Contains(err.Error(), "HTTPS") {
		t.Errorf("expected error message to mention HTTPS, got '%s'", err.Error())
	}
}

// TestFetch_LoopbackIPBlocked はループバックアドレス（127.0.0.1）へのリクエストが
// DialContext 内でブロックされることをテストします。
func TestFetch_LoopbackIPBlocked(t *testing.T) {
	// HTTPS のテストサーバーを作成（TLS 付き）
	ts := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("<html><head><meta property=\"og:title\" content=\"test\" /></head></html>"))
	}))
	defer ts.Close()

	// NewScraper はカスタム Transport を使用するため、TLS テストサーバーの
	// 自己署名証明書を信頼しない。代わりに scraper の httpClient を
	// TLS サーバーのクライアント（証明書を信頼済み）に置き換えつつ、
	// DialContext による IP チェックは維持する。
	//
	// ただし httptest.NewTLSServer は 127.0.0.1 でリッスンするため、
	// DialContext のプライベート IP チェックでブロックされるはず。
	scraper := NewScraper()

	// テストサーバーの URL は https://127.0.0.1:PORT 形式
	_, err := scraper.Fetch(context.Background(), ts.URL)

	if err == nil {
		t.Fatal("expected error for loopback IP, got nil")
	}

	// DialContext 内の SSRFError は http.Client がラップするため、
	// errors.Is ではなくエラーメッセージで検証
	if !strings.Contains(err.Error(), "private IP") {
		t.Errorf("expected error about private IP, got '%s'", err.Error())
	}
}

// TestFetch_ValidHTTPSURL は正当な HTTPS URL が正常に処理されることをテストします。
// テストサーバー（127.0.0.1）はプライベートIPなのでブロックされるため、
// このテストでは Fetch 内の URL 検証ロジック（スキームチェック）のみを検証します。
func TestFetch_SchemeValidation(t *testing.T) {
	scraper := NewScraper()

	tests := []struct {
		name    string
		url     string
		wantErr bool
		errMsg  string
	}{
		{
			name:    "HTTP URL is blocked",
			url:     "http://example.com",
			wantErr: true,
			errMsg:  "HTTPS",
		},
		{
			name:    "FTP URL is blocked",
			url:     "ftp://example.com/file.xml",
			wantErr: true,
			errMsg:  "HTTPS",
		},
		{
			name:    "JavaScript URL is blocked",
			url:     "javascript:alert(1)",
			wantErr: true,
			errMsg:  "HTTPS",
		},
		{
			name:    "Data URL is blocked",
			url:     "data:text/html,<h1>test</h1>",
			wantErr: true,
			errMsg:  "HTTPS",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := scraper.Fetch(context.Background(), tt.url)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if !strings.Contains(err.Error(), tt.errMsg) {
					t.Errorf("expected error containing '%s', got '%s'", tt.errMsg, err.Error())
				}
				// HTTP/FTP/etc. はスキームチェックで弾かれるため ErrSSRFBlocked
				if !errors.Is(err, ErrSSRFBlocked) {
					t.Errorf("expected ErrSSRFBlocked, got %v", err)
				}
			}
		})
	}
}

// TestSSRFError_Unwrap は SSRFError が ErrSSRFBlocked を正しく返すことをテストします。
func TestSSRFError_Unwrap(t *testing.T) {
	err := &SSRFError{Reason: "test reason"}

	if err.Error() != "test reason" {
		t.Errorf("expected 'test reason', got '%s'", err.Error())
	}

	if !errors.Is(err, ErrSSRFBlocked) {
		t.Error("expected errors.Is(err, ErrSSRFBlocked) to be true")
	}

	// errors.As で SSRFError を取り出せること
	var ssrfErr *SSRFError
	if !errors.As(err, &ssrfErr) {
		t.Error("expected errors.As to succeed for *SSRFError")
	}
	if ssrfErr.Reason != "test reason" {
		t.Errorf("expected reason 'test reason', got '%s'", ssrfErr.Reason)
	}
}
