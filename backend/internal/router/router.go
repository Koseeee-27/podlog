// Package router はアプリケーションのルーティング定義を一箇所にまとめます。
// Echo のグループ機能を使って /api/v1 プレフィックスでAPIをバージョニングします。
package router

import (
	"github.com/kobayashikosei/podlog/backend/internal/handler"
	mw "github.com/kobayashikosei/podlog/backend/internal/middleware"
	"github.com/labstack/echo/v4"
)

// Handlers は全ハンドラーをまとめた構造体です。
type Handlers struct {
	Health  *handler.HealthHandler
	User    *handler.UserHandler
	Podcast *handler.PodcastHandler
	Episode *handler.EpisodeHandler
}

// Setup は全ルートを Echo インスタンスに登録します。
// supabaseURL は Supabase プロジェクトの URL（例: https://xxx.supabase.co）です。
// JWKS エンドポイントから公開鍵を取得して JWT 検証に使います。
func Setup(e *echo.Echo, h Handlers, supabaseURL string) {
	v1 := e.Group("/api/v1")

	// ── 認証不要のルート ──
	v1.GET("/health", h.Health.Check)

	// Users
	v1.GET("/users/:username", h.User.GetPublicProfile)

	// Podcasts (公開)
	v1.GET("/podcasts/:id", h.Podcast.GetByID)
	v1.GET("/podcasts/:id/episodes", h.Episode.GetByPodcastID)

	// Episodes (公開)
	v1.GET("/episodes/:id", h.Episode.GetByID)

	// ── 認証が必要なルート ──
	auth := v1.Group("", mw.JWTAuth(supabaseURL))

	// Users (認証必要)
	auth.POST("/users/profile", h.User.CreateProfile)
	auth.GET("/users/me", h.User.GetMyProfile)
	auth.PUT("/users/me", h.User.UpdateMyProfile)

	// Podcasts (認証必要)
	auth.GET("/podcasts/search", h.Podcast.Search)
	auth.POST("/podcasts/fetch-url", h.Podcast.FetchURL)

	// Episodes (認証必要)
	auth.POST("/podcasts/:id/episodes", h.Episode.Create)
	auth.POST("/podcasts/:id/episodes/fetch", h.Episode.FetchFromFeed)
}
