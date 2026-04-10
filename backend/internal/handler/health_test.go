package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"
	"github.com/labstack/echo/v4"
)

// TestHealthCheck_DBHealthy は DB が正常な場合に 200 OK を返すことを確認するテストです。
func TestHealthCheck_DBHealthy(t *testing.T) {
	// sqlmock で DB のモックを作成する。
	// sqlmock は実際の DB に接続せずに DB の振る舞いをシミュレートするライブラリ。
	mockDB, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer mockDB.Close()

	// sqlx.NewDb で sqlmock の *sql.DB を sqlx.DB にラップする
	db := sqlx.NewDb(mockDB, "postgres")

	// Ping が成功することを期待する
	mock.ExpectPing()

	// Echo のテスト用コンテキストを作成
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// ハンドラーを実行
	h := NewHealthHandler(db)
	if err := h.Check(c); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// ステータスコードが 200 であること
	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	// sqlmock の期待が全て満たされたことを確認
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

// TestHealthCheck_DBUnhealthy は DB が接続できない場合に 503 を返すことを確認するテストです。
func TestHealthCheck_DBUnhealthy(t *testing.T) {
	mockDB, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer mockDB.Close()

	db := sqlx.NewDb(mockDB, "postgres")

	// Ping がエラーを返すことを設定
	mock.ExpectPing().WillReturnError(errors.New("connection refused"))

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := NewHealthHandler(db)
	if err := h.Check(c); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// DB 接続失敗時は 503 Service Unavailable を返す
	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("expected status %d, got %d", http.StatusServiceUnavailable, rec.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}
