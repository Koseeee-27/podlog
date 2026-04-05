package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
)

func TestTimeout_NormalRequest(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// 1秒のタイムアウトで、すぐに返るハンドラー
	mw := Timeout(1 * time.Second)
	handler := mw(func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})

	if err := handler(c); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestTimeout_ExceededRequest(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// 10ms のタイムアウトで、100ms かかるハンドラー
	mw := Timeout(10 * time.Millisecond)
	handler := mw(func(c echo.Context) error {
		// コンテキストのキャンセルを待つ
		<-c.Request().Context().Done()
		return c.Request().Context().Err()
	})

	err := handler(c)
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	// Echo の HTTPError として 504 が返ること
	he, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected *echo.HTTPError, got %T", err)
	}
	if he.Code != http.StatusGatewayTimeout {
		t.Errorf("status = %d, want %d", he.Code, http.StatusGatewayTimeout)
	}
}

func TestTimeout_Constants(t *testing.T) {
	if DefaultTimeout != 30*time.Second {
		t.Errorf("DefaultTimeout = %v, want 30s", DefaultTimeout)
	}
	if ExternalTimeout != 60*time.Second {
		t.Errorf("ExternalTimeout = %v, want 60s", ExternalTimeout)
	}
}
