// Package middleware はHTTPリクエストの前処理を行うミドルウェアを定義します。
// ミドルウェアはハンドラーの前に実行され、認証チェックやCORS設定などを行います。
package middleware

import (
	"context"
	"fmt"
	"log"
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
func JWTAuth(supabaseURL string) echo.MiddlewareFunc {
	// JWKS エンドポイントの URL を組み立てる
	// Supabase の JWKS は /auth/v1/ 配下にある
	// 例: https://abcdefg.supabase.co/auth/v1/.well-known/jwks.json
	jwksURL := supabaseURL + "/auth/v1/.well-known/jwks.json"

	// keyfunc を初期化: JWKS URL から公開鍵を取得してキャッシュする
	// この公開鍵は JWT の署名検証に使われる
	k, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil {
		log.Fatalf("Failed to create JWKS keyfunc from URL %s: %v", jwksURL, err)
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// 1. Authorization ヘッダーを取得
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				log.Printf("[AUTH] No Authorization header for %s %s", c.Request().Method, c.Request().URL.Path)
				return response.Error(c, http.StatusUnauthorized, "missing authorization header")
			}

			// "Bearer " プレフィックスを除去してトークン部分を取り出す
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				log.Printf("[AUTH] Invalid header format for %s %s", c.Request().Method, c.Request().URL.Path)
				return response.Error(c, http.StatusUnauthorized, "invalid authorization header format")
			}
			tokenString := parts[1]

			// 2. JWT トークンを検証
			// k.KeyfuncCtx が JWKS の公開鍵を使って署名を検証する
			token, err := jwt.Parse(tokenString, k.KeyfuncCtx(context.Background()))
			if err != nil || !token.Valid {
				log.Printf("[AUTH] Token validation failed for %s %s: %v", c.Request().Method, c.Request().URL.Path, err)
				return response.Error(c, http.StatusUnauthorized, "invalid or expired token")
			}

			// 3. クレームからユーザーIDを取得
			// Supabase の JWT には "sub" クレームにユーザーの UUID が入っている
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				return response.Error(c, http.StatusUnauthorized, "invalid token claims")
			}

			sub, ok := claims["sub"].(string)
			if !ok {
				return response.Error(c, http.StatusUnauthorized, "missing sub claim")
			}

			userID, err := uuid.Parse(sub)
			if err != nil {
				return response.Error(c, http.StatusUnauthorized, "invalid user id in token")
			}

			// 4. Echo コンテキストにユーザーIDをセット
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
//   エピソード一覧・詳細 API のように、未認証でもアクセスできるが、
//   認証済みの場合は追加情報（聴取状態など）を返したいエンドポイントで使います。
//
// トークンがある場合の処理は JWTAuth と同じ（JWT 検証 → userID をコンテキストにセット）。
// トークンが無効な場合はログを出力してスキップします（エラーにはしない）。
func OptionalJWTAuth(supabaseURL string) echo.MiddlewareFunc {
	jwksURL := supabaseURL + "/auth/v1/.well-known/jwks.json"

	k, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil {
		log.Fatalf("Failed to create JWKS keyfunc from URL %s: %v", jwksURL, err)
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Authorization ヘッダーがなければそのまま通過（認証なしでもOK）
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return next(c)
			}

			// "Bearer " プレフィックスを除去してトークン部分を取り出す
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				// フォーマットが不正でもエラーにはせずスキップ
				return next(c)
			}
			tokenString := parts[1]

			// JWT トークンを検証
			token, err := jwt.Parse(tokenString, k.KeyfuncCtx(context.Background()))
			if err != nil || !token.Valid {
				// トークンが無効でもエラーにはせずスキップ（ログは残す）
				log.Printf("[OPTIONAL_AUTH] Token validation failed for %s %s: %v", c.Request().Method, c.Request().URL.Path, err)
				return next(c)
			}

			// クレームからユーザーIDを取得
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				return next(c)
			}

			sub, ok := claims["sub"].(string)
			if !ok {
				return next(c)
			}

			userID, err := uuid.Parse(sub)
			if err != nil {
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
