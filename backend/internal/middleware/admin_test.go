package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// TestAdminAuth_AdminUser は管理者ユーザーがアクセスした場合に
// 次のハンドラーが正常に実行されることを検証します。
func TestAdminAuth_AdminUser(t *testing.T) {
	// テスト用の管理者 ID を生成
	adminID := uuid.New()
	adminUserIDs := []string{adminID.String()}

	// Echo のテスト用セットアップ
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/admin/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// JWTAuth が設定するのと同じように user_id をコンテキストにセット
	c.Set(contextKeyUserID, adminID)

	// AdminAuth ミドルウェアを通してハンドラーを実行
	handler := AdminAuth(adminUserIDs)(func(c echo.Context) error {
		return c.String(http.StatusOK, "admin access granted")
	})

	err := handler(c)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// 200 OK が返ること（ミドルウェアを通過してハンドラーが実行された）
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
}

// TestAdminAuth_NonAdminUser は管理者でないユーザーがアクセスした場合に
// 403 Forbidden が返されることを検証します。
func TestAdminAuth_NonAdminUser(t *testing.T) {
	adminID := uuid.New()
	normalUserID := uuid.New() // 管理者リストに含まれない別のユーザー
	adminUserIDs := []string{adminID.String()}

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/admin/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// 一般ユーザーの ID をコンテキストにセット
	c.Set(contextKeyUserID, normalUserID)

	handler := AdminAuth(adminUserIDs)(func(c echo.Context) error {
		return c.String(http.StatusOK, "should not reach here")
	})

	err := handler(c)
	if err != nil {
		t.Fatalf("expected no error (response handled), got %v", err)
	}

	// 403 Forbidden が返ること
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", rec.Code)
	}
}

// TestAdminAuth_NoUserID はコンテキストに user_id がセットされていない場合に
// 401 Unauthorized が返されることを検証します。
// （通常は JWTAuth が先に実行されるため、この状況は起きないが、安全のためチェック）
func TestAdminAuth_NoUserID(t *testing.T) {
	adminUserIDs := []string{uuid.New().String()}

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/admin/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// user_id をセットしない

	handler := AdminAuth(adminUserIDs)(func(c echo.Context) error {
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

// TestAdminAuth_EmptyAdminList は管理者リストが空の場合に
// 全ユーザーが 403 Forbidden になることを検証します。
func TestAdminAuth_EmptyAdminList(t *testing.T) {
	adminUserIDs := []string{} // 空リスト

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/admin/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	c.Set(contextKeyUserID, uuid.New())

	handler := AdminAuth(adminUserIDs)(func(c echo.Context) error {
		return c.String(http.StatusOK, "should not reach here")
	})

	err := handler(c)
	if err != nil {
		t.Fatalf("expected no error (response handled), got %v", err)
	}

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", rec.Code)
	}
}

// TestAdminAuth_MultipleAdmins は複数の管理者がリストにある場合に
// いずれの管理者もアクセスできることを検証します。
func TestAdminAuth_MultipleAdmins(t *testing.T) {
	admin1 := uuid.New()
	admin2 := uuid.New()
	adminUserIDs := []string{admin1.String(), admin2.String()}

	// admin2 でアクセス
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/admin/test", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set(contextKeyUserID, admin2)

	handler := AdminAuth(adminUserIDs)(func(c echo.Context) error {
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

// TestIsAdmin はヘルパー関数 IsAdmin のテストです。
func TestIsAdmin(t *testing.T) {
	adminID := uuid.New()
	normalID := uuid.New()
	adminUserIDs := []string{adminID.String()}

	// 管理者 ID の場合 true
	if !IsAdmin(adminID, adminUserIDs) {
		t.Error("expected IsAdmin to return true for admin user")
	}

	// 一般ユーザー ID の場合 false
	if IsAdmin(normalID, adminUserIDs) {
		t.Error("expected IsAdmin to return false for non-admin user")
	}

	// 空リストの場合 false
	if IsAdmin(adminID, []string{}) {
		t.Error("expected IsAdmin to return false for empty admin list")
	}
}
