// Package middleware - AdminAuth は管理者権限チェックのミドルウェアです。
package middleware

import (
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/labstack/echo/v4"
)

// AdminAuth は管理者のみアクセスを許可するミドルウェアです。
//
// JWTAuth ミドルウェアの後に実行されることを前提としています。
// JWTAuth がコンテキストにセットした user_id を取得し、
// adminUserIDs（管理者ユーザー ID のリスト）に含まれるかをチェックします。
//
// 含まれない場合は 403 Forbidden を返してリクエストを拒否します。
// 403 は「認証はされているが、権限がない」ことを意味します。
// （401 は「認証されていない」、403 は「認証済みだが権限不足」）
//
// adminUserIDs: 環境変数 ADMIN_USER_IDS から読み込んだ管理者 ID のスライス
func AdminAuth(adminUserIDs []string) echo.MiddlewareFunc {
	// adminSet: スライスを map に変換して高速に検索できるようにする
	// map[string]struct{}{} は Go で「集合（Set）」を表現する慣用的な方法。
	// struct{}{} はメモリを消費しないため、bool より効率的。
	adminSet := make(map[string]struct{}, len(adminUserIDs))
	for _, id := range adminUserIDs {
		adminSet[id] = struct{}{}
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// JWTAuth がセットした user_id を取得
			userID, err := GetUserID(c)
			if err != nil {
				log.Printf("[ADMIN] user_id not found in context for %s %s", c.Request().Method, c.Request().URL.Path)
				return response.Error(c, http.StatusUnauthorized, "unauthorized")
			}

			// 管理者 ID リストに含まれるかチェック
			// uuid.UUID を文字列に変換して比較する
			if _, ok := adminSet[userID.String()]; !ok {
				log.Printf("[ADMIN] Access denied for user %s to %s %s", userID.String(), c.Request().Method, c.Request().URL.Path)
				return response.Error(c, http.StatusForbidden, "admin access required")
			}

			return next(c)
		}
	}
}

// IsAdmin はユーザー ID が管理者リストに含まれるかチェックするヘルパー関数です。
// ハンドラーやユースケースで「このユーザーは管理者か?」を判定するのに使います。
func IsAdmin(userID uuid.UUID, adminUserIDs []string) bool {
	userIDStr := userID.String()
	for _, id := range adminUserIDs {
		if id == userIDStr {
			return true
		}
	}
	return false
}
