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
// 「ラッパー（NewRateLimiter）が期待どおり設定を組み立てているか」と
// 「本番と同じ IPExtractor 設定下で IP 特定が期待どおり動作するか」を
// エンドツーエンドに近い形で検証することに集中する。
//
// ポイント:
//   - Echo の RateLimiter は拒否時に DenyHandler が返した echo.HTTPError を
//     c.Error(...) 経由で HTTPErrorHandler に渡す。そのため、実際のレスポンス
//     (ステータス・ヘッダ) を確認するには echo.Echo.ServeHTTP を通す必要がある。
//   - cmd/server/main.go と同じ IPExtractor (ExtractIPFromXFFHeader + TrustLoopback +
//     TrustPrivateNet) をテストでも設定し、本番の挙動を再現する。
//   - 本番では X-Forwarded-For の先頭を信じない動作になるため、テストで
//     「先頭が偽装されていてもバケット回避できない」ことまで検証する。
//
// IPExtractor の挙動メモ (テストでのクライアント識別に影響):
//
//	ExtractIPFromXFFHeader + TrustLoopback + TrustPrivateNet の組み合わせでは
//	右端から trust 対象 (loopback / private) をスキップし、最初に現れた
//	untrusted (= パブリック) な IP を返す。
//	httptest.NewRequest のデフォルト RemoteAddr は "192.0.2.1:1234" (TEST-NET-1、
//	パブリック扱い) なので、`XFF` のみ設定しても右端の RemoteAddr が返されてしまい、
//	XFF の値による識別子の違いは生まれない。
//	そのためテストでは基本的に RemoteAddr 側を変えて「異なるクライアント」を
//	表現し、XFF は偽装検証テストでのみ使用する。

// newRateLimiterTestEcho はテスト専用の Echo インスタンスを作成し、
// NewRateLimiter を適用した /test エンドポイントを登録します。
// 本物の HTTP サーバーは立てず、e.ServeHTTP(rec, req) で直接リクエストを流します。
//
// 本番 (cmd/server/main.go) と同じ IPExtractor および HTTPErrorHandler を設定することで、
// 本番とテストの挙動差を無くします。特に後者は重要で、Echo のデフォルト
// HTTPErrorHandler (DefaultHTTPErrorHandler) は *echo.HTTPError.Internal を
// 優先採用するため、RateLimiter 内部で Internal に詰められたエラーを拾って通ってしまう。
// 本番の NewHTTPErrorHandler は errors.As で「最外層」を取るので、テストだけで
// 通る現象を防ぐには本番と同じ handler を使う必要がある。
func newRateLimiterTestEcho(reqPerMin, burst int) *echo.Echo {
	e := echo.New()
	e.IPExtractor = echo.ExtractIPFromXFFHeader(
		echo.TrustLoopback(true),
		echo.TrustPrivateNet(true),
	)
	e.HTTPErrorHandler = NewHTTPErrorHandler(false) // 本番相当（isDev=false）
	e.GET("/test", func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	}, NewRateLimiter(reqPerMin, burst))
	return e
}

// requestOptions はテスト用リクエストのオプションをまとめた構造体です。
type requestOptions struct {
	// remoteAddr は TCP 接続元の IP:port。未指定ならデフォルトの "192.0.2.1:1234"。
	// IPExtractor に TrustLoopback(true) と TrustPrivateNet(true) を渡している前提では、
	// これがパブリック IP であれば識別子として使われ、loopback / private なら XFF 側に
	// フォールバックする。
	remoteAddr string
	// xff は X-Forwarded-For ヘッダの生値 (カンマ区切り複数 OK)。空なら未設定。
	xff string
}

// sendRequest は /test にリクエストを送り、ResponseRecorder を返します。
func sendRequest(e *echo.Echo, opts requestOptions) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	if opts.remoteAddr != "" {
		req.RemoteAddr = opts.remoteAddr
	}
	if opts.xff != "" {
		req.Header.Set("X-Forwarded-For", opts.xff)
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
		// RemoteAddr 未指定 = httptest デフォルト "192.0.2.1:1234" で同一クライアント扱い
		rec := sendRequest(e, requestOptions{})
		if rec.Code != http.StatusOK {
			t.Errorf("request %d: status = %d, want %d", i, rec.Code, http.StatusOK)
		}
	}
}

// TestRateLimiter_RejectsBeyondBurst は burst を超過したリクエストが
// 429 Too Many Requests + Retry-After ヘッダ付きで拒否されることを検証します。
//
// reqPerMin=60 のとき Retry-After は ceil(60/60) = 1 秒になる。
func TestRateLimiter_RejectsBeyondBurst(t *testing.T) {
	e := newRateLimiterTestEcho(60, 2)

	// 最初の 2 回は許可（バケット消費）
	for i := 1; i <= 2; i++ {
		rec := sendRequest(e, requestOptions{})
		if rec.Code != http.StatusOK {
			t.Fatalf("setup request %d: status = %d, want %d", i, rec.Code, http.StatusOK)
		}
	}

	// 3 回目はバケットが空になっているので拒否されるはず。
	rec := sendRequest(e, requestOptions{})
	if rec.Code != http.StatusTooManyRequests {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusTooManyRequests)
	}

	// reqPerMin=60 なら Retry-After は "1" (= ceil(60/60))
	if got := rec.Header().Get("Retry-After"); got != "1" {
		t.Errorf("Retry-After header = %q, want %q", got, "1")
	}
}

// TestRateLimiter_RetryAfterVariesByRate は reqPerMin に応じて
// Retry-After ヘッダが正しく計算されることを検証します。
//
// 設計意図: クライアントに対して「実際にトークンが補充される時間」を返し、
// 不必要に長い待機を強いないため。
func TestRateLimiter_RetryAfterVariesByRate(t *testing.T) {
	tests := []struct {
		name           string
		reqPerMin      int
		wantRetryAfter string
	}{
		{"60req/min (v1 相当)", 60, "1"},   // ceil(60/60) = 1
		{"20req/min (v1Ext 相当)", 20, "3"}, // ceil(60/20) = 3
		{"30req/min", 30, "2"},            // ceil(60/30) = 2
		{"1req/min", 1, "60"},             // ceil(60/1)  = 60
		{"120req/min (最小 1 秒保証)", 120, "1"}, // ceil(60/120)=1 (切り上げで 1 秒)
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := newRateLimiterTestEcho(tt.reqPerMin, 1) // burst 1: 2 回目で必ず拒否
			// 1 回目は許可、2 回目で拒否を引き出す
			_ = sendRequest(e, requestOptions{})
			rec := sendRequest(e, requestOptions{})
			if rec.Code != http.StatusTooManyRequests {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusTooManyRequests)
			}
			if got := rec.Header().Get("Retry-After"); got != tt.wantRetryAfter {
				t.Errorf("Retry-After = %q, want %q", got, tt.wantRetryAfter)
			}
		})
	}
}

// TestRateLimiter_PerIPIndependence は IP アドレスごとに独立した
// バケットが確保されており、あるIP の消費が他 IP に影響しないことを検証します。
//
// RemoteAddr を変えることで「別クライアント」を再現します。
// 両方とも TEST-NET-3 (203.0.113.0/24、ドキュメント用のパブリック IP 扱い) を使用。
func TestRateLimiter_PerIPIndependence(t *testing.T) {
	e := newRateLimiterTestEcho(60, 2)

	const clientAAddr = "203.0.113.1:1234"
	const clientBAddr = "203.0.113.2:1234"

	// IP A: バケットを使い切る
	for i := 1; i <= 2; i++ {
		rec := sendRequest(e, requestOptions{remoteAddr: clientAAddr})
		if rec.Code != http.StatusOK {
			t.Fatalf("IP A request %d: status = %d, want %d", i, rec.Code, http.StatusOK)
		}
	}
	// IP A の 3 回目は拒否される
	if rec := sendRequest(e, requestOptions{remoteAddr: clientAAddr}); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("IP A exhausted: status = %d, want %d", rec.Code, http.StatusTooManyRequests)
	}

	// IP B は別のバケットを持つので、IP A の消費に関係なく許可されるはず
	if rec := sendRequest(e, requestOptions{remoteAddr: clientBAddr}); rec.Code != http.StatusOK {
		t.Errorf("IP B: status = %d, want %d (different IP should have its own bucket)", rec.Code, http.StatusOK)
	}
}

// TestRateLimiter_XFFSpoofingDoesNotBypass は X-Forwarded-For の先頭に
// 偽装値を挿入しても、レート制限をバイパスできないことを検証します。
//
// シナリオ:
//   - Cloud Run の LB は XFF の右端にクライアントの真の IP を追記する
//   - LB 自身のプライベート IP が RemoteAddr に入る (= 10.x.x.x 等)
//   - 攻撃者は毎回違う値 (SPOOF_A / SPOOF_B) を XFF の先頭に偽装して送り、
//     1 リクエストごとに別バケット扱いにしてレート制限を回避しようとする
//
// ExtractIPFromXFFHeader + TrustPrivateNet のおかげで:
//  1. RemoteAddr (プライベート IP) は trust されてスキップ
//  2. XFF 右端の真のクライアント IP (パブリック) が識別子として取られる
//  3. 偽装された XFF 先頭の値は無視される
//
// → 攻撃者のリクエストは全て同じバケット (真のクライアント IP) で処理され、
// 通常どおりレート制限される。
func TestRateLimiter_XFFSpoofingDoesNotBypass(t *testing.T) {
	e := newRateLimiterTestEcho(60, 2)

	// LB のプライベート IP (RemoteAddr) と真のクライアント IP (XFF 右端) は固定、
	// 偽装値 (XFF 先頭) だけを変えながら 3 回送る。
	const lbPrivateAddr = "10.0.0.1:1234"
	const realClientIP = "203.0.113.5" // TEST-NET-3 (ドキュメント用のパブリック IP)

	// 1 回目: バケット 1 個消費 → 200
	rec1 := sendRequest(e, requestOptions{
		remoteAddr: lbPrivateAddr,
		xff:        "198.51.100.1, " + realClientIP, // 先頭に偽装値 A
	})
	if rec1.Code != http.StatusOK {
		t.Fatalf("request 1 (spoof A): status = %d, want %d", rec1.Code, http.StatusOK)
	}

	// 2 回目: バケット 1 個消費 → 200
	rec2 := sendRequest(e, requestOptions{
		remoteAddr: lbPrivateAddr,
		xff:        "198.51.100.2, " + realClientIP, // 先頭に偽装値 B (違う値)
	})
	if rec2.Code != http.StatusOK {
		t.Fatalf("request 2 (spoof B): status = %d, want %d", rec2.Code, http.StatusOK)
	}

	// 3 回目: burst=2 を超えるので 429 のはず。
	// 偽装値 C を送っても真のクライアント IP は同じバケットなので拒否される。
	rec3 := sendRequest(e, requestOptions{
		remoteAddr: lbPrivateAddr,
		xff:        "198.51.100.3, " + realClientIP, // 先頭に偽装値 C
	})
	if rec3.Code != http.StatusTooManyRequests {
		t.Errorf("request 3 (spoof C): status = %d, want %d (spoofing XFF head must not bypass rate limit)", rec3.Code, http.StatusTooManyRequests)
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
				rec := sendRequest(e, requestOptions{})
				if rec.Code != http.StatusOK {
					t.Errorf("request %d: status = %d, want %d", i, rec.Code, http.StatusOK)
				}
			}
			// burst+1 個目は拒否される
			rec := sendRequest(e, requestOptions{})
			if rec.Code != http.StatusTooManyRequests {
				t.Errorf("request %d (over burst): status = %d, want %d", tt.wantAllowed+1, rec.Code, http.StatusTooManyRequests)
			}
		})
	}
}

// TestRateLimiter_EmptyIPReturnsError は IP が抽出できない異常ケースで
// IdentifierExtractor がエラーを返し、レート制限ではなく 400 Bad Request
// として扱われることを検証します。
//
// 背景:
//
//	c.RealIP() が空文字を返すケース (XFF なし + RemoteAddr も空 = テスト等)
//	では全リクエストが「空文字キー」という単一バケットに集約され、
//	無関係なユーザー同士が巻き添えで 429 になる問題がある。
//	IdentifierExtractor 側でエラーを返し、デフォルトの ErrorHandler に
//	委ねることで、静かに落ちるのではなく明示的なエラーレスポンスにする。
func TestRateLimiter_EmptyIPReturnsError(t *testing.T) {
	e := newRateLimiterTestEcho(60, 2)

	// RemoteAddr を "invalid" にすると net.SplitHostPort が失敗し、
	// さらに net.ParseIP も失敗するため c.RealIP() は "" を返す。
	// 空白だけを指定する方法もあるが、意図が伝わりにくいのでパース不能な固定文字列にする。
	rec := sendRequest(e, requestOptions{remoteAddr: "invalid"})
	// IdentifierExtractor が *echo.HTTPError(400, "client ip unavailable") を返し、
	// RateLimiterConfig.ErrorHandler でそのままパススルー → 本番の HTTPErrorHandler が
	// 400 Bad Request を返す。
	//
	// 注意: ErrorHandler を明示設定していないと、Echo のデフォルト ErrorHandler が
	//       *echo.HTTPError(403 ErrExtractorError) で wrap してしまい、本プロジェクトの
	//       HTTPErrorHandler (errors.As で最外層を取る) が 403 を返す回帰につながる。
	//       ここで 400 が出ていれば ErrorHandler のパススルーが効いている証拠。
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d (empty identifier must be rejected with 400, not 403)", rec.Code, http.StatusBadRequest)
	}
}

// TestNewRateLimiter_PanicsOnInvalidArgs は reqPerMin / burst が 0 以下の場合に
// 起動時 panic することを検証します。
//
// 背景: rate.Limit(0) は全拒否、60/0 は +Inf → Retry-After に異常値が入る等、
// ランタイム事故の原因になるため、起動時に落として誤設定を早期検出する。
func TestNewRateLimiter_PanicsOnInvalidArgs(t *testing.T) {
	tests := []struct {
		name      string
		reqPerMin int
		burst     int
	}{
		{"reqPerMin が 0", 0, 10},
		{"reqPerMin が負", -5, 10},
		{"burst が 0", 60, 0},
		{"burst が負", 60, -1},
		{"両方 0", 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			defer func() {
				if r := recover(); r == nil {
					t.Errorf("expected panic for reqPerMin=%d, burst=%d, but did not panic", tt.reqPerMin, tt.burst)
				}
			}()
			_ = NewRateLimiter(tt.reqPerMin, tt.burst)
		})
	}
}

// ============================================================
// hashIdentifier のテスト
// ============================================================

// TestHashIdentifier は同じ入力から必ず同じハッシュが出ることと、
// 異なる入力からは異なるハッシュが出ることを検証します。
func TestHashIdentifier(t *testing.T) {
	tests := []struct {
		name string
		a    string
		b    string
		want bool // true: 一致すべき、false: 不一致すべき
	}{
		{"同じ IP は同じハッシュ", "1.2.3.4", "1.2.3.4", true},
		{"違う IP は違うハッシュ", "1.2.3.4", "5.6.7.8", false},
		{"空文字もハッシュ可能", "", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ha := hashIdentifier(tt.a)
			hb := hashIdentifier(tt.b)
			if (ha == hb) != tt.want {
				t.Errorf("hashIdentifier(%q) == hashIdentifier(%q): got %v, want %v", tt.a, tt.b, ha == hb, tt.want)
			}
			// 頭 identifierHashLen 文字に切り詰められている
			if len(ha) != identifierHashLen {
				t.Errorf("len(hash) = %d, want %d", len(ha), identifierHashLen)
			}
		})
	}
}
