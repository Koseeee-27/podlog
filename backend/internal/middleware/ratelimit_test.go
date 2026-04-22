package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

// ============================================================
// NewRateLimiter のテスト
// ============================================================
//
// レート制限の中核は golang.org/x/time/rate.Limiter のトークンバケットで、
// Echo の middleware.RateLimiter 側のロジックは非常に薄い。そのため本テストは
// 「ラッパー（NewRateLimiter）が期待どおり設定を組み立てているか」を
// エンドツーエンドに近い形で検証することに集中する。
//
// ポイント:
//   - Echo の RateLimiter は拒否時に DenyHandler が返した echo.HTTPError を
//     c.Error(...) 経由で HTTPErrorHandler に渡す。そのため、実際のレスポンス
//     (ステータス・ヘッダ) を確認するには echo.Echo.ServeHTTP を通す必要がある。
//   - 同一 IP で連続リクエストを送るケースと、異なる IP 間でバケットが
//     独立している（カウントが混ざらない）ケースの両方を検証する。

// newRateLimiterTestEcho はテスト専用の Echo インスタンスを作成し、
// NewRateLimiter を適用した /test エンドポイントを登録します。
// 本物の HTTP サーバーは立てず、e.ServeHTTP(rec, req) で直接リクエストを流します。
func newRateLimiterTestEcho(reqPerMin, burst int) *echo.Echo {
	e := echo.New()
	e.GET("/test", func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	}, NewRateLimiter(reqPerMin, burst))
	return e
}

// sendRequest は /test に対して 1 回リクエストを送り、
// ResponseRecorder を返します。forwardedIP を渡すと X-Forwarded-For ヘッダが
// 設定され、Echo の c.RealIP() はその IP をクライアント IP として扱います。
func sendRequest(e *echo.Echo, forwardedIP string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	if forwardedIP != "" {
		req.Header.Set("X-Forwarded-For", forwardedIP)
	}
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

// TestRateLimiter_AllowsUpToBurst は burst 分のリクエストが全て 200 を返すことを検証します。
//
// トークンバケットの仕組み（補足）:
//
//	burst=2 のとき、初期状態でバケットには 2 トークンあります。
//	リクエスト 1 回ごとに 1 トークン消費するので、2 回までは即時に許可されます。
func TestRateLimiter_AllowsUpToBurst(t *testing.T) {
	// 1 req/sec（= 60 req/min）、burst 2 の設定。
	// 1 秒以内に 2 回までのリクエストを許可する。
	e := newRateLimiterTestEcho(60, 2)

	for i := 1; i <= 2; i++ {
		rec := sendRequest(e, "1.2.3.4")
		if rec.Code != http.StatusOK {
			t.Errorf("request %d: status = %d, want %d", i, rec.Code, http.StatusOK)
		}
	}
}

// TestRateLimiter_RejectsBeyondBurst は burst を超過したリクエストが
// 429 Too Many Requests + Retry-After: 60 ヘッダで拒否されることを検証します。
func TestRateLimiter_RejectsBeyondBurst(t *testing.T) {
	e := newRateLimiterTestEcho(60, 2)

	// 最初の 2 回は許可（バケット消費）
	for i := 1; i <= 2; i++ {
		rec := sendRequest(e, "1.2.3.4")
		if rec.Code != http.StatusOK {
			t.Fatalf("setup request %d: status = %d, want %d", i, rec.Code, http.StatusOK)
		}
	}

	// 3 回目はバケットが空になっているので拒否されるはず。
	// Rate=1 req/sec なのでテスト実行時間（ミリ秒）では補充されない。
	rec := sendRequest(e, "1.2.3.4")
	if rec.Code != http.StatusTooManyRequests {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusTooManyRequests)
	}

	// Retry-After ヘッダが付与されていること
	if got := rec.Header().Get("Retry-After"); got != "60" {
		t.Errorf("Retry-After header = %q, want %q", got, "60")
	}
}

// TestRateLimiter_PerIPIndependence は IP アドレスごとに独立した
// バケットが確保されており、あるIP の消費が他 IP に影響しないことを検証します。
func TestRateLimiter_PerIPIndependence(t *testing.T) {
	e := newRateLimiterTestEcho(60, 2)

	// IP A: バケットを使い切る
	for i := 1; i <= 2; i++ {
		rec := sendRequest(e, "1.2.3.4")
		if rec.Code != http.StatusOK {
			t.Fatalf("IP A request %d: status = %d, want %d", i, rec.Code, http.StatusOK)
		}
	}
	// IP A の 3 回目は拒否される
	if rec := sendRequest(e, "1.2.3.4"); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("IP A exhausted: status = %d, want %d", rec.Code, http.StatusTooManyRequests)
	}

	// IP B は別のバケットを持つので、IP A の消費に関係なく許可されるはず
	if rec := sendRequest(e, "5.6.7.8"); rec.Code != http.StatusOK {
		t.Errorf("IP B: status = %d, want %d (different IP should have its own bucket)", rec.Code, http.StatusOK)
	}
}

// TestNewRateLimiter_ConfigVariants は reqPerMin / burst の組み合わせが
// 期待どおりにバケット容量として反映されることをテーブル駆動で検証します。
//
// テーブル駆動テスト（table-driven test）とは:
//
//	テストケースをスライスにまとめて for ループで 1 つずつ実行するパターン。
//	Go の慣例で、似たような検証を複数繰り返す場合はこの書き方が読みやすい。
func TestNewRateLimiter_ConfigVariants(t *testing.T) {
	tests := []struct {
		name      string
		reqPerMin int
		burst     int
		// 初期状態で許可されるべきリクエスト数（= burst）
		wantAllowed int
	}{
		{
			name:        "通常の公開エンドポイント: 60req/min, burst 20",
			reqPerMin:   60,
			burst:       20,
			wantAllowed: 20,
		},
		{
			name:        "外部通信含む公開エンドポイント: 20req/min, burst 5",
			reqPerMin:   20,
			burst:       5,
			wantAllowed: 5,
		},
		{
			name:        "最小構成: 60req/min, burst 1",
			reqPerMin:   60,
			burst:       1,
			wantAllowed: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := newRateLimiterTestEcho(tt.reqPerMin, tt.burst)

			// burst 個までのリクエストは許可される
			for i := 1; i <= tt.wantAllowed; i++ {
				rec := sendRequest(e, "10.0.0.1")
				if rec.Code != http.StatusOK {
					t.Errorf("request %d: status = %d, want %d", i, rec.Code, http.StatusOK)
				}
			}
			// burst+1 個目は拒否される
			rec := sendRequest(e, "10.0.0.1")
			if rec.Code != http.StatusTooManyRequests {
				t.Errorf("request %d (over burst): status = %d, want %d", tt.wantAllowed+1, rec.Code, http.StatusTooManyRequests)
			}
		})
	}
}
