package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

// newSitemapAuthTestEcho はテスト専用の Echo インスタンスを作成し、
// SitemapAuth を適用した /sitemap/test エンドポイントを登録します。
//
// rules/backend.md「ミドルウェアのテストは本番と同じ HTTPErrorHandler を設定する」
// に従い、本番相当の HTTPErrorHandler を必ず設定する。
// （素の echo.New() のデフォルト HTTPErrorHandler は HTTPError.Internal を優先採用するため、
//   テストだけ通って本番では別ステータスが返るケースがある。PR podlog#374 と同じ罠を避ける）
func newSitemapAuthTestEcho(expectedToken string, isDev bool) *echo.Echo {
	e := echo.New()
	e.HTTPErrorHandler = NewHTTPErrorHandler(false) // 本番相当（isDev=false）
	e.GET("/sitemap/test", func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	}, SitemapAuth(expectedToken, isDev))
	return e
}

// sendSitemapRequest は /sitemap/test に Authorization ヘッダーを付けてリクエストを送ります。
// authHeader が空文字列の場合は Authorization ヘッダー自体を付けません。
func sendSitemapRequest(e *echo.Echo, authHeader string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/sitemap/test", nil)
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

// TestSitemapAuth_ValidToken は正しいトークンを送ったときに 200 が返ることを検証します。
func TestSitemapAuth_ValidToken(t *testing.T) {
	const token = "valid-token-abc123"
	e := newSitemapAuthTestEcho(token, false)

	rec := sendSitemapRequest(e, "Bearer "+token)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}

// TestSitemapAuth_MissingHeader は Authorization ヘッダー自体が無い場合に
// 401 が返ることを検証します。
func TestSitemapAuth_MissingHeader(t *testing.T) {
	e := newSitemapAuthTestEcho("expected-token", false)

	rec := sendSitemapRequest(e, "")

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

// TestSitemapAuth_WrongToken は誤ったトークンを送ったときに 401 が返ることを検証します。
func TestSitemapAuth_WrongToken(t *testing.T) {
	e := newSitemapAuthTestEcho("expected-token", false)

	rec := sendSitemapRequest(e, "Bearer wrong-token")

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

// TestSitemapAuth_DevModePassesWithoutHeader は dev モードでヘッダー無しでも素通しすることを検証します。
//
// 背景: ローカル開発時は FE 側もヘッダーを付けない構成のため、ここで弾くと開発が回らない。
// 本番では isDev=false を渡してヘッダー検証が動く。
func TestSitemapAuth_DevModePassesWithoutHeader(t *testing.T) {
	e := newSitemapAuthTestEcho("expected-token", true)

	rec := sendSitemapRequest(e, "")

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d (dev mode should pass through)", rec.Code, http.StatusOK)
	}
}

// TestSitemapAuth_DevModePassesWithWrongToken は dev モードでは誤トークンも素通しすることを検証します。
//
// dev モードはトークン検証ロジック自体をスキップするため、誤った値でもブロックされない。
// 「dev では一切のヘッダー検証をしない」という挙動を仕様として固定するためのテスト。
func TestSitemapAuth_DevModePassesWithWrongToken(t *testing.T) {
	e := newSitemapAuthTestEcho("expected-token", true)

	rec := sendSitemapRequest(e, "Bearer wrong-token")

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d (dev mode should pass through regardless of token)", rec.Code, http.StatusOK)
	}
}

// TestSitemapAuth_DevModePassesWithEmptyExpectedToken は dev モードで expectedToken が
// 空文字列のときも素通しすることを検証します。
//
// 背景: Config.Validate() は development 環境では SITEMAP_API_TOKEN 未設定を許可する
// 仕様（cfg.Environment == "development" の場合は必須チェックをスキップ）。
// したがって dev では「expectedToken が空 + isDev=true」の組み合わせで起動するのが
// 通常運用パターンとなる。middleware 側もこのケースで素通しすることを保証しないと、
// Config 仕様と middleware の挙動が乖離してしまう。
//
// このテストは「dev では fail-secure（expectedToken=="" → 401）チェックよりも先に
// isDev による早期 return が効く」という挙動を仕様として固定する。将来 isDev 判定を
// fail-secure チェックの後ろに動かすような変更が入ったら、このテストが落ちて回帰を
// 検知できる。
func TestSitemapAuth_DevModePassesWithEmptyExpectedToken(t *testing.T) {
	e := newSitemapAuthTestEcho("", true) // dev モード + トークン未設定（dev での通常運用形態）

	// ヘッダーが付いていない / 何かしら付いている、いずれでも素通しすることを確認。
	tests := []struct {
		name       string
		authHeader string
	}{
		{"ヘッダー無し", ""},
		{"ヘッダーあり（dev では検証されない）", "Bearer anything"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := sendSitemapRequest(e, tt.authHeader)
			if rec.Code != http.StatusOK {
				t.Errorf("status = %d, want %d (dev mode + empty expectedToken should pass through)", rec.Code, http.StatusOK)
			}
		})
	}
}

// TestSitemapAuth_FailSecureWhenExpectedTokenIsEmpty は本番モードで expectedToken が
// 空文字列（設定漏れ）のとき、クライアントが正しい形式の Bearer ヘッダーを送っても
// 401 が返ることを検証します。これが SitemapAuth の fail-secure 分岐の本質的なテスト。
//
// 背景: extractBearerToken が空トークン（"Bearer " など TrimSpace 後に空）を
// tokenInvalidFormat で弾くため、ヘッダー無しや空トークンを送るケースは
// TestSitemapAuth_MissingHeader / TestSitemapAuth_EmptyBearer 側で網羅されている。
// したがって fail-secure 分岐（expectedToken == "" のチェック）に到達する唯一の
// シナリオは「expectedToken が空 + クライアントが何らかの非空トークンを送る」
// のケースであり、それを 1 ケースで確認する。
func TestSitemapAuth_FailSecureWhenExpectedTokenIsEmpty(t *testing.T) {
	e := newSitemapAuthTestEcho("", false)

	rec := sendSitemapRequest(e, "Bearer some-guess")

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (fail-secure when expectedToken is empty)", rec.Code, http.StatusUnauthorized)
	}
}

// TestSitemapAuth_NonBearerScheme は Bearer 以外のスキーム（Basic 等）を送ったときに
// 401 が返ることを検証します。
func TestSitemapAuth_NonBearerScheme(t *testing.T) {
	e := newSitemapAuthTestEcho("expected-token", false)

	rec := sendSitemapRequest(e, "Basic some-base64-value")

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}

// TestSitemapAuth_BearerWithExtraSpaces は "Bearer  <token>"（空白 2 個）のように
// フォーマットが崩れているときの挙動を検証します。
//
// extractBearerToken は SplitN(..., 2) でパースするため、"Bearer  <token>" は
// 2 番目の要素が " <token>" になる。TrimSpace でトリミングされるため有効な
// トークンとして扱われる。これは攻撃面ではなく利便性の挙動なので、
// 「正しいトークン文字列が後続にあれば許可される」ことを確認する仕様の固定化。
func TestSitemapAuth_BearerWithExtraSpaces(t *testing.T) {
	const token = "valid-token-abc123"
	e := newSitemapAuthTestEcho(token, false)

	rec := sendSitemapRequest(e, "Bearer  "+token)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d (extra space between Bearer and token should be tolerated)", rec.Code, http.StatusOK)
	}
}

// TestSitemapAuth_EmptyBearer は "Bearer "（トークン部分が空）の場合に
// 401 が返ることを検証します。
//
// extractBearerToken の TrimSpace で空文字列に潰れ、tokenInvalidFormat が返るパス。
func TestSitemapAuth_EmptyBearer(t *testing.T) {
	e := newSitemapAuthTestEcho("expected-token", false)

	rec := sendSitemapRequest(e, "Bearer ")

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
	}
}
