package middleware

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

func TestClassifyError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		isDev    bool
		wantCode int
		wantMsg  string
	}{
		{
			name:     "echo.HTTPError は元のコードとメッセージを返す",
			err:      echo.NewHTTPError(http.StatusBadRequest, "bad request"),
			wantCode: http.StatusBadRequest,
			wantMsg:  "bad request",
		},
		{
			name:     "echo.HTTPError でメッセージが文字列でない場合はステータステキスト",
			err:      echo.NewHTTPError(http.StatusUnauthorized),
			wantCode: http.StatusUnauthorized,
			wantMsg:  "Unauthorized",
		},
		{
			name:     "echo.HTTPError の 5xx は本番で詳細を隠す",
			err:      echo.NewHTTPError(http.StatusInternalServerError, "db connection pool exhausted"),
			isDev:    false,
			wantCode: http.StatusInternalServerError,
			wantMsg:  "Internal Server Error",
		},
		{
			name:     "echo.HTTPError の 5xx は開発環境で詳細を返す",
			err:      echo.NewHTTPError(http.StatusInternalServerError, "db connection pool exhausted"),
			isDev:    true,
			wantCode: http.StatusInternalServerError,
			wantMsg:  "db connection pool exhausted",
		},
		{
			name:     "NotFoundError は 404 を返す",
			err:      &usecase.NotFoundError{Resource: "podcast"},
			wantCode: http.StatusNotFound,
			wantMsg:  "podcast not found",
		},
		{
			name:     "ラップされた NotFoundError も 404 を返す",
			err:      fmt.Errorf("usecase: %w", &usecase.NotFoundError{Resource: "episode"}),
			wantCode: http.StatusNotFound,
			wantMsg:  "episode not found",
		},
		{
			name:     "ValidationError は 400 を返す",
			err:      &usecase.ValidationError{Message: "invalid input"},
			wantCode: http.StatusBadRequest,
			wantMsg:  "invalid input",
		},
		{
			name:     "ConflictError は 409 を返す",
			err:      &usecase.ConflictError{Message: "already exists"},
			wantCode: http.StatusConflict,
			wantMsg:  "already exists",
		},
		{
			name:     "SSRFBlockedError は 400 を返す",
			err:      &usecase.SSRFBlockedError{Message: "blocked"},
			wantCode: http.StatusBadRequest,
			wantMsg:  "blocked",
		},
		{
			name:     "未知のエラーは本番で詳細を隠す",
			err:      errors.New("database connection failed"),
			isDev:    false,
			wantCode: http.StatusInternalServerError,
			wantMsg:  "internal server error",
		},
		{
			name:     "未知のエラーは開発環境で詳細を返す",
			err:      errors.New("database connection failed"),
			isDev:    true,
			wantCode: http.StatusInternalServerError,
			wantMsg:  "database connection failed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			code, msg := classifyError(tt.err, tt.isDev)
			if code != tt.wantCode {
				t.Errorf("code = %d, want %d", code, tt.wantCode)
			}
			if msg != tt.wantMsg {
				t.Errorf("msg = %q, want %q", msg, tt.wantMsg)
			}
		})
	}
}

func TestNewHTTPErrorHandler(t *testing.T) {
	t.Run("エラーレスポンスが JSON 形式で返る", func(t *testing.T) {
		e := echo.New()
		handler := NewHTTPErrorHandler(false)

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handler(&usecase.NotFoundError{Resource: "episode"}, c)

		if rec.Code != http.StatusNotFound {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusNotFound)
		}

		var body map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatalf("failed to parse response body: %v", err)
		}
		if body["error"] != "episode not found" {
			t.Errorf("error = %q, want %q", body["error"], "episode not found")
		}
	})

	t.Run("HEAD リクエストではボディを返さない", func(t *testing.T) {
		e := echo.New()
		handler := NewHTTPErrorHandler(false)

		req := httptest.NewRequest(http.MethodHead, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handler(&usecase.NotFoundError{Resource: "podcast"}, c)

		if rec.Code != http.StatusNotFound {
			t.Errorf("status = %d, want %d", rec.Code, http.StatusNotFound)
		}
		if rec.Body.Len() != 0 {
			t.Errorf("body should be empty for HEAD, got %q", rec.Body.String())
		}
	})

	t.Run("レスポンスがコミット済みの場合は何もしない", func(t *testing.T) {
		e := echo.New()
		handler := NewHTTPErrorHandler(false)

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// レスポンスを先にコミット
		c.String(http.StatusOK, "already sent")
		originalBody := rec.Body.String()

		handler(errors.New("should be ignored"), c)

		// ステータスが変わっていないこと
		if rec.Code != http.StatusOK {
			t.Errorf("status = %d, want %d (should not change)", rec.Code, http.StatusOK)
		}
		// ボディが変わっていないこと
		if !strings.Contains(rec.Body.String(), originalBody) {
			t.Errorf("body should not change after committed response")
		}
	})
}
