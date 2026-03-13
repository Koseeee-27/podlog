// Package router はアプリケーションのルーティング定義を一箇所にまとめます。
// Echo のグループ機能を使って /api/v1 プレフィックスでAPIをバージョニングします。
package router

import (
	"github.com/Koseeee-27/podlog/backend/internal/handler"
	mw "github.com/Koseeee-27/podlog/backend/internal/middleware"
	"github.com/labstack/echo/v4"
)

// Handlers は全ハンドラーをまとめた構造体です。
type Handlers struct {
	Health          *handler.HealthHandler
	User            *handler.UserHandler
	Podcast         *handler.PodcastHandler
	Episode         *handler.EpisodeHandler
	ListeningRecord *handler.ListeningRecordHandler
	Review          *handler.ReviewHandler
	FavoritePodcast *handler.FavoritePodcastHandler
	PodcastRequest  *handler.PodcastRequestHandler
}

// Setup は全ルートを Echo インスタンスに登録します。
// supabaseURL は Supabase プロジェクトの URL（例: https://xxx.supabase.co）です。
// JWKS エンドポイントから公開鍵を取得して JWT 検証に使います。
func Setup(e *echo.Echo, h Handlers, supabaseURL string) {
	v1 := e.Group("/api/v1")

	// ── 認証不要のルート ──
	v1.GET("/health", h.Health.Check)

	// Users (公開)
	v1.GET("/users/:username", h.User.GetPublicProfile)
	v1.GET("/users/:username/listening-records", h.ListeningRecord.GetUserListeningRecords)
	v1.GET("/users/:username/reviews", h.Review.GetUserReviews)
	v1.GET("/users/:username/favorite-podcasts", h.FavoritePodcast.GetUserFavoritePodcasts)

	// Podcasts (公開)
	v1.GET("/podcasts/search", h.Podcast.Search)
	v1.GET("/podcasts/:id", h.Podcast.GetByID)
	v1.GET("/podcasts/:id/episodes", h.Episode.GetByPodcastID)

	// Episodes (公開)
	v1.GET("/episodes/:id", h.Episode.GetByID)
	v1.GET("/episodes/:id/reviews", h.Review.GetByEpisodeID)

	// Podcasts 評価 (公開)
	v1.GET("/podcasts/:id/rating", h.Review.GetPodcastRating)

	// Timeline (公開)
	v1.GET("/timeline", h.Review.GetTimeline)

	// ── 認証が必要なルート ──
	auth := v1.Group("", mw.JWTAuth(supabaseURL))

	// Users (認証必要)
	auth.POST("/users/profile", h.User.CreateProfile)
	auth.GET("/users/me", h.User.GetMyProfile)
	auth.PUT("/users/me", h.User.UpdateMyProfile)

	// Podcasts (認証必要)
	auth.POST("/podcasts/fetch-url", h.Podcast.FetchURL)

	// Episodes (認証必要)
	auth.POST("/podcasts/:id/episodes", h.Episode.Create)
	auth.POST("/podcasts/:id/episodes/fetch", h.Episode.FetchFromFeed)

	// Listening Records (認証必要)
	auth.POST("/episodes/:id/listen", h.ListeningRecord.Create)
	auth.DELETE("/episodes/:id/listen", h.ListeningRecord.Delete)
	auth.GET("/episodes/:id/listen", h.ListeningRecord.GetStatus)
	auth.GET("/users/me/listening-records", h.ListeningRecord.GetMyRecords)

	// Reviews (認証必要)
	auth.POST("/episodes/:id/reviews", h.Review.Create)
	auth.GET("/episodes/:id/reviews/mine", h.Review.GetMyReview)
	auth.PUT("/episodes/:id/reviews/mine", h.Review.Update)
	auth.DELETE("/episodes/:id/reviews/mine", h.Review.Delete)
	auth.GET("/users/me/reviews", h.Review.GetMyReviews)

	// Favorite Podcasts (認証必要)
	auth.PUT("/users/me/favorite-podcasts", h.FavoritePodcast.UpdateFavoritePodcasts)

	// Podcast Requests (認証必要)
	auth.POST("/podcasts/request", h.PodcastRequest.Create)
}
