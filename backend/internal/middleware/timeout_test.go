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
	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	}, Timeout(1*time.Second))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestTimeout_ExceededRequest(t *testing.T) {
	e := echo.New()
	// タイムアウト時に 504 + JSON で返すカスタムエラーハンドラーを設定
	e.HTTPErrorHandler = func(err error, c echo.Context) {
		if he, ok := err.(*echo.HTTPError); ok {
			if msg, ok := he.Message.(string); ok {
				c.JSON(he.Code, map[string]string{"error": msg})
			} else {
				c.JSON(he.Code, map[string]string{"error": http.StatusText(he.Code)})
			}
		}
	}
	e.GET("/", func(c echo.Context) error {
		// コンテキストのキャンセルを待つハンドラー
		<-c.Request().Context().Done()
		return c.Request().Context().Err()
	}, Timeout(10*time.Millisecond))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusGatewayTimeout {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusGatewayTimeout)
	}
	if rec.Body.Len() == 0 {
		t.Fatal("expected response body to be written")
	}
}

func TestTimeout_Constants(t *testing.T) {
	if DefaultTimeout <= 0 {
		t.Errorf("DefaultTimeout should be positive, got %v", DefaultTimeout)
	}
	if ExternalTimeout <= 0 {
		t.Errorf("ExternalTimeout should be positive, got %v", ExternalTimeout)
	}
	if DefaultTimeout >= ExternalTimeout {
		t.Errorf("DefaultTimeout (%v) should be less than ExternalTimeout (%v)", DefaultTimeout, ExternalTimeout)
	}
}
