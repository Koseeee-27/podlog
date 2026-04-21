// Package middleware はHTTPリクエストの前処理を行うミドルウェアを定義します。
// ミドルウェアはハンドラーの前に実行され、認証チェックやCORS設定などを行います。
package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/labstack/echo/v4"
)

// contextKey はコンテキストにユーザーIDを格納するためのキーです。
const contextKeyUserID = "user_id"

// NewJWKSKeyfunc は Supabase の JWKS エンドポイントから公開鍵を取得する keyfunc を初期化します。
//
// この関数はアプリケーション起動時に 1 回だけ呼び出し、
// 戻り値を JWTAuth / OptionalJWTAuth で共有して使います。
// こうすることで、JWKS のキャッシュやバックグラウンドリフレッシュの goroutine が
// 1 つだけになり、リソースの無駄遣いを防げます。
//
// keyfunc.Keyfunc とは:
//   - JWT の署名検証に必要な公開鍵を管理するオブジェクト
//   - JWKS URL から鍵を自動取得・キャッシュし、定期的に更新してくれる
func NewJWKSKeyfunc(supabaseURL string) (keyfunc.Keyfunc, error) {
	// 環境変数の手入力で末尾に "/" が付いている場合に備えて正規化する
	// 例: "https://xxx.supabase.co/" → "https://xxx.supabase.co"
	jwksURL := strings.TrimRight(supabaseURL, "/") + "/auth/v1/.well-known/jwks.json"

	k, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil {
		return nil, fmt.Errorf("failed to create JWKS keyfunc from URL %s: %w", jwksURL, err)
	}

	return k, nil
}

// parseAndValidateToken はJWTトークンの検証・クレーム取得・UUID変換を行う共通関数です。
//
// JWTAuth と OptionalJWTAuth の両方で同じ処理（トークンパース → sub クレーム取得 → UUID 変換）
// が必要なため、重複を避けるために内部関数として切り出しています。
//
// 引数:
//   - ctx: リクエストのコンテキスト。タイムアウトやキャンセルが JWT 検証にも伝播する
//   - tokenString: "Bearer " プレフィックスを除いた JWT トークン文字列
//   - k: JWKS の公開鍵を管理する keyfunc（NewJWKSKeyfunc で初期化したもの）
//
// 戻り値:
//   - uuid.UUID: トークンの sub クレームから取得したユーザーID
//   - error: 検証失敗・クレーム不正・UUID パース失敗のいずれかの場合にエラーを返す
func parseAndValidateToken(ctx context.Context, tokenString string, k keyfunc.Keyfunc) (uuid.UUID, error) {
	// JWT トークンを検証
	// k.KeyfuncCtx にリクエストコンテキストを渡すことで、
	// リクエストのタイムアウト/キャンセルが JWKS の鍵取得処理にも伝わる
	// （以前は context.Background() を使っていたため伝播しなかった）
	token, err := jwt.Parse(tokenString, k.KeyfuncCtx(ctx))
	if err != nil {
		return uuid.Nil, fmt.Errorf("token parse failed: %w", err)
	}
	if !token.Valid {
		return uuid.Nil, fmt.Errorf("token is not valid")
	}

	// クレームからユーザーIDを取得
	// Supabase の JWT には "sub" クレームにユーザーの UUID が入っている
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return uuid.Nil, fmt.Errorf("invalid token claims")
	}

	sub, ok := claims["sub"].(string)
	if !ok {
		return uuid.Nil, fmt.Errorf("missing sub claim")
	}

	userID, err := uuid.Parse(sub)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid user id in token: %w", err)
	}

	return userID, nil
}

// bearerTokenResult は extractBearerToken の結果を表す列挙型です。
//
// Go には enum がないため、定数で代替しています。
// bool だけでは「ヘッダーがない」と「フォーマット不正」を区別できないため、
// デバッグしやすいように 3 状態にしています。
type bearerTokenResult int

const (
	// tokenOK はトークンが正常に取得できた状態
	tokenOK bearerTokenResult = iota
	// tokenMissing は Authorization ヘッダー自体がない状態
	tokenMissing
	// tokenInvalidFormat は Authorization ヘッダーはあるが "Bearer <token>" 形式でない状態
	tokenInvalidFormat
)

// extractBearerToken は Authorization ヘッダーから "Bearer <token>" のトークン部分を取り出します。
//
// 戻り値:
//   - string: トークン文字列（取得できなかった場合は空文字）
//   - bearerTokenResult: 取得結果（tokenOK / tokenMissing / tokenInvalidFormat）
func extractBearerToken(c echo.Context) (string, bearerTokenResult) {
	authHeader := c.Request().Header.Get("Authorization")
	if authHeader == "" {
		return "", tokenMissing
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", tokenInvalidFormat
	}

	// 複数空白（"Bearer  <token>"）への防御として TrimSpace する
	token := strings.TrimSpace(parts[1])
	if token == "" {
		return "", tokenInvalidFormat
	}

	return token, tokenOK
}

// JWTAuth は Supabase が発行した JWT トークンを検証するミドルウェアです。
//
// Supabase は ECC (ES256) で JWT に署名します。
// 署名の検証には JWKS（JSON Web Key Set）エンドポイントから公開鍵を取得して使います。
//
// JWKS とは:
//   - JWT の署名を検証するための公開鍵を配布する標準的な仕組み
//   - Supabase は https://<project>.supabase.co/auth/v1/.well-known/jwks.json で公開鍵を提供
//   - keyfunc ライブラリが自動的にこのURLから鍵を取得・キャッシュしてくれる
//
// 処理の流れ:
//  1. Authorization ヘッダーから "Bearer <token>" を取得
//  2. JWKS の公開鍵を使って JWT の署名を検証
//  3. トークンの sub クレーム（Supabase のユーザーID）を取得
//  4. Echo のコンテキストにユーザーIDをセットして、ハンドラーから参照可能にする
//
// 引数の k は NewJWKSKeyfunc で初期化した keyfunc を渡します。
// 複数のミドルウェアで同じ keyfunc を共有することで、JWKS のキャッシュが 1 つになります。
func JWTAuth(k keyfunc.Keyfunc) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ctx := c.Request().Context()
			method := c.Request().Method
			path := c.Request().URL.Path

			// 1. Authorization ヘッダーからトークンを取得
			tokenString, result := extractBearerToken(c)
			if result != tokenOK {
				// 認証失敗はクライアント起因で想定内のため WARN。
				// ERROR にすると Cloud Error Reporting に通知されてノイズになる。
				if result == tokenMissing {
					slog.WarnContext(ctx, "missing authorization header",
						"method", method,
						"path", path,
					)
					return response.Error(c, http.StatusUnauthorized, "missing authorization header")
				}
				slog.WarnContext(ctx, "invalid authorization header format",
					"method", method,
					"path", path,
				)
				return response.Error(c, http.StatusUnauthorized, "invalid authorization header format")
			}

			// 2. JWT トークンを検証し、ユーザーIDを取得
			// c.Request().Context() を渡すことで、リクエストのタイムアウトが検証処理にも適用される
			userID, err := parseAndValidateToken(ctx, tokenString, k)
			if err != nil {
				// JWT 期限切れ等は日常的に発生するため WARN。
				slog.WarnContext(ctx, "jwt validation failed",
					"method", method,
					"path", path,
					"error", err,
				)
				return response.Error(c, http.StatusUnauthorized, "invalid or expired token")
			}

			// 3. Echo コンテキストにユーザーIDをセット
			// ハンドラーで c.Get("user_id") として取得できるようになる
			c.Set(contextKeyUserID, userID)

			// 次のハンドラー（またはミドルウェア）を実行
			return next(c)
		}
	}
}

// OptionalJWTAuth は認証トークンがあれば検証し、なければスキップするミドルウェアです。
//
// JWTAuth との違い:
//   - JWTAuth: トークンがない場合は 401 エラーを返す（認証必須のエンドポイント用）
//   - OptionalJWTAuth: トークンがない場合はそのまま通過する（公開エンドポイントで認証情報を利用したい場合用）
//
// 用途:
//
//	エピソード一覧・詳細 API のように、未認証でもアクセスできるが、
//	認証済みの場合は追加情報（聴取状態など）を返したいエンドポイントで使います。
//
// トークンがある場合の処理は JWTAuth と同じ（JWT 検証 → userID をコンテキストにセット）。
// トークンが無効な場合はログを出力してスキップします（エラーにはしない）。
//
// 引数の k は NewJWKSKeyfunc で初期化した keyfunc を渡します。
func OptionalJWTAuth(k keyfunc.Keyfunc) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Authorization ヘッダーがなければそのまま通過（認証なしでもOK）
			tokenString, result := extractBearerToken(c)
			if result != tokenOK {
				return next(c)
			}

			ctx := c.Request().Context()

			// JWT トークンを検証
			userID, err := parseAndValidateToken(ctx, tokenString, k)
			if err != nil {
				// 検証エラー時はログを残してスキップ（エラーにはしない）
				// OptionalJWTAuth は未認証でも通過するため、トークン不正は通常運用で起き得る → WARN
				slog.WarnContext(ctx, "optional jwt validation failed, continuing as unauthenticated",
					"method", c.Request().Method,
					"path", c.Request().URL.Path,
					"error", err,
				)
				return next(c)
			}

			// コンテキストにユーザーIDをセット
			c.Set(contextKeyUserID, userID)

			return next(c)
		}
	}
}

// GetUserID は Echo コンテキストから認証済みユーザーのIDを取得するヘルパーです。
// JWTAuth ミドルウェアの後で使用することを前提としています。
func GetUserID(c echo.Context) (uuid.UUID, error) {
	userID, ok := c.Get(contextKeyUserID).(uuid.UUID)
	if !ok {
		return uuid.Nil, fmt.Errorf("user_id not found in context")
	}
	return userID, nil
}

// GetOptionalUserID は Echo コンテキストからユーザーIDを取得するヘルパーです。
// OptionalJWTAuth ミドルウェアの後で使用します。
//
// 戻り値:
//   - 認証済みの場合: ユーザーIDのポインタ
//   - 未認証の場合: nil
func GetOptionalUserID(c echo.Context) *uuid.UUID {
	userID, ok := c.Get(contextKeyUserID).(uuid.UUID)
	if !ok {
		return nil
	}
	return &userID
}
