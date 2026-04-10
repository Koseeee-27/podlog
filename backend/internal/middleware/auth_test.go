package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// ============================================================
// extractBearerToken のテスト
// ============================================================

// TestExtractBearerToken はヘッダーの各パターンを検証するテーブル駆動テストです。
//
// テーブル駆動テスト（table-driven test）とは:
//
//	テストケースをスライス（配列のようなもの）にまとめて、
//	for ループで1つずつ実行するパターン。
//	テストケースの追加が簡単で、Go のテストでは標準的な書き方。
func TestExtractBearerToken(t *testing.T) {
	tests := []struct {
		name           string            // テストケースの名前
		authHeader     string            // Authorization ヘッダーの値
		wantToken      string            // 期待するトークン文字列
		wantResult     bearerTokenResult // 期待する結果
	}{
		{
			name:       "正常なBearerトークン",
			authHeader: "Bearer valid-token-string",
			wantToken:  "valid-token-string",
			wantResult: tokenOK,
		},
		{
			name:       "ヘッダーなし",
			authHeader: "",
			wantToken:  "",
			wantResult: tokenMissing,
		},
		{
			name:       "Bearerプレフィックスなし",
			authHeader: "Basic some-credentials",
			wantToken:  "",
			wantResult: tokenInvalidFormat,
		},
		{
			name:       "Bearerのみ（トークンなし）",
			authHeader: "Bearer",
			wantToken:  "",
			wantResult: tokenInvalidFormat,
		},
		{
			name:       "空白のみ",
			authHeader: " ",
			wantToken:  "",
			wantResult: tokenInvalidFormat,
		},
		{
			name:       "Bearer（小文字）",
			authHeader: "bearer some-token",
			wantToken:  "",
			wantResult: tokenInvalidFormat,
		},
		{
			name:       "Bearerの後にトークンなし（末尾スペース）",
			authHeader: "Bearer ",
			wantToken:  "",
			wantResult: tokenInvalidFormat,
		},
		{
			name:       "Bearerの後に空白のみ",
			authHeader: "Bearer   ",
			wantToken:  "",
			wantResult: tokenInvalidFormat,
		},
	}

	for _, tt := range tests {
		// t.Run でサブテストを作成
		// テスト失敗時に「どのケースで失敗したか」が明確になる
		t.Run(tt.name, func(t *testing.T) {
			e := echo.New()
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			token, result := extractBearerToken(c)

			if result != tt.wantResult {
				t.Errorf("result = %d, want %d", result, tt.wantResult)
			}
			if token != tt.wantToken {
				t.Errorf("token = %q, want %q", token, tt.wantToken)
			}
		})
	}
}

// ============================================================
// JWTAuth ミドルウェアのテスト（ヘッダー検証のみ）
// ============================================================
// 注意: JWT の署名検証はモック JWKS サーバーが必要なため、
//       ここではヘッダーが不正な場合のエラーレスポンスを検証します。
//       実際の JWT 検証はインテグレーションテストで行います。

// TestJWTAuth_MissingHeader は Authorization ヘッダーがない場合に
// 401 Unauthorized が返されることを検証します。
func TestJWTAuth_MissingHeader(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// keyfunc は nil でも、ヘッダーチェックの段階で弾かれるため問題ない
	handler := JWTAuth(nil)(func(c echo.Context) error {
		return c.String(http.StatusOK, "should not reach here")
	})

	err := handler(c)
	if err != nil {
		t.Fatalf("expected no error (response handled), got %v", err)
	}

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
}

// TestJWTAuth_InvalidHeaderFormat は Authorization ヘッダーのフォーマットが
// "Bearer <token>" でない場合に 401 が返されることを検証します。
func TestJWTAuth_InvalidHeaderFormat(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Basic some-credentials")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handler := JWTAuth(nil)(func(c echo.Context) error {
		return c.String(http.StatusOK, "should not reach here")
	})

	err := handler(c)
	if err != nil {
		t.Fatalf("expected no error (response handled), got %v", err)
	}

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", rec.Code)
	}
}

// ============================================================
// OptionalJWTAuth ミドルウェアのテスト
// ============================================================

// TestOptionalJWTAuth_NoHeader は Authorization ヘッダーがない場合に
// 認証なしでハンドラーが実行されることを検証します。
func TestOptionalJWTAuth_NoHeader(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handler := OptionalJWTAuth(nil)(func(c echo.Context) error {
		// user_id がセットされていないことを確認
		userID := GetOptionalUserID(c)
		if userID != nil {
			t.Error("expected no user_id in context, but got one")
		}
		return c.String(http.StatusOK, "ok")
	})

	err := handler(c)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
}

// TestOptionalJWTAuth_InvalidFormat は Authorization ヘッダーのフォーマットが
// 不正な場合に、エラーにならず認証なしでハンドラーが実行されることを検証します。
func TestOptionalJWTAuth_InvalidFormat(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Basic some-credentials")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handler := OptionalJWTAuth(nil)(func(c echo.Context) error {
		userID := GetOptionalUserID(c)
		if userID != nil {
			t.Error("expected no user_id in context, but got one")
		}
		return c.String(http.StatusOK, "ok")
	})

	err := handler(c)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
}

// ============================================================
// GetUserID / GetOptionalUserID のテスト
// ============================================================

// TestGetUserID_Success はコンテキストに user_id がセットされている場合に
// 正しく取得できることを検証します。
func TestGetUserID_Success(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	expected := uuid.New()
	c.Set(contextKeyUserID, expected)

	got, err := GetUserID(c)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if got != expected {
		t.Errorf("got %v, want %v", got, expected)
	}
}

// TestGetUserID_NotSet はコンテキストに user_id がセットされていない場合に
// エラーが返されることを検証します。
func TestGetUserID_NotSet(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	_, err := GetUserID(c)
	if err == nil {
		t.Error("expected error when user_id not set, got nil")
	}
}

// TestGetOptionalUserID_Set はコンテキストに user_id がセットされている場合に
// ポインタで正しく取得できることを検証します。
func TestGetOptionalUserID_Set(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	expected := uuid.New()
	c.Set(contextKeyUserID, expected)

	got := GetOptionalUserID(c)
	if got == nil {
		t.Fatal("expected non-nil user_id, got nil")
	}
	if *got != expected {
		t.Errorf("got %v, want %v", *got, expected)
	}
}

// TestGetOptionalUserID_NotSet はコンテキストに user_id がセットされていない場合に
// nil が返されることを検証します。
func TestGetOptionalUserID_NotSet(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	got := GetOptionalUserID(c)
	if got != nil {
		t.Errorf("expected nil, got %v", *got)
	}
}
