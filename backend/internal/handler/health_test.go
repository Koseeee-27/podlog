package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"
	"github.com/labstack/echo/v4"
)

// TestHealthCheck はヘルスチェックエンドポイントの正常系・異常系をテーブル駆動テストで確認します。
//
// テーブル駆動テスト:
//
//	テストケースをスライスに定義し、ループで回すパターン。
//	ケースを追加するだけで新しいテストを増やせる。
func TestHealthCheck(t *testing.T) {
	tests := []struct {
		name           string // テストケースの説明
		setupMock      func(mock sqlmock.Sqlmock)
		wantStatus     int
		wantBodyKey    string // レスポンス JSON のキー（"status" or "error"）
		wantBodyValue  string // そのキーに期待する値
	}{
		{
			name: "DB が正常な場合は 200 OK を返す",
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectPing()
			},
			wantStatus:    http.StatusOK,
			wantBodyKey:   "status",
			wantBodyValue: "ok",
		},
		{
			name: "DB 接続失敗時は 503 Service Unavailable を返す",
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectPing().WillReturnError(errors.New("connection refused"))
			},
			wantStatus:    http.StatusServiceUnavailable,
			wantBodyKey:   "error",
			wantBodyValue: "service unavailable",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// sqlmock で DB のモックを作成する。
			// sqlmock は実際の DB に接続せずに DB の振る舞いをシミュレートするライブラリ。
			// MonitorPingsOption(true) で Ping() の呼び出しを検知できるようにする。
			mockDB, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
			if err != nil {
				t.Fatalf("failed to create sqlmock: %v", err)
			}
			defer mockDB.Close()

			// sqlx.NewDb で sqlmock の *sql.DB を sqlx.DB にラップする
			db := sqlx.NewDb(mockDB, "postgres")

			// テストケースごとにモックの期待を設定
			tt.setupMock(mock)

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

			// ステータスコードを検証
			if rec.Code != tt.wantStatus {
				t.Errorf("status: got %d, want %d", rec.Code, tt.wantStatus)
			}

			// レスポンスボディを JSON としてパースし、期待する値と比較
			var body map[string]string
			if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
				t.Fatalf("failed to parse response body: %v", err)
			}

			if got := body[tt.wantBodyKey]; got != tt.wantBodyValue {
				t.Errorf("body[%q]: got %q, want %q", tt.wantBodyKey, got, tt.wantBodyValue)
			}

			// sqlmock の期待が全て満たされたことを確認
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Errorf("unfulfilled expectations: %v", err)
			}
		})
	}
}
