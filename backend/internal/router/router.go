// Package router はアプリケーションのルーティング定義を一箇所にまとめます。
// Echo のグループ機能を使って /api/v1 プレフィックスでAPIをバージョニングします。
package router

import (
	"github.com/Koseeee-27/podlog/backend/internal/handler"
	mw "github.com/Koseeee-27/podlog/backend/internal/middleware"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
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
	Genre           *handler.GenreHandler
	Admin           *handler.AdminHandler
}

// Setup は全ルートを Echo インスタンスに登録します。
// supabaseURL は Supabase プロジェクトの URL（例: https://xxx.supabase.co）です。
// JWKS エンドポイントから公開鍵を取得して JWT 検証に使います。
// adminUserIDs は管理者ユーザー ID のリストです。/admin API へのアクセスを制限します。
func Setup(e *echo.Echo, h Handlers, supabaseURL string, adminUserIDs []string) {
	v1 := e.Group("/api/v1")

	// ── 認証不要のルート ──
	v1.GET("/health", h.Health.Check)

	// Users (公開)
	v1.GET("/users/:username", h.User.GetPublicProfile)
	v1.GET("/users/:username/listening-records", h.ListeningRecord.GetUserListeningRecords)
	v1.GET("/users/:username/reviews", h.Review.GetUserReviews)
	v1.GET("/users/:username/favorite-podcasts", h.FavoritePodcast.GetUserFavoritePodcasts)

	// Genres (公開)
	v1.GET("/genres", h.Genre.ListGenres)

	// Podcasts (公開)
	v1.GET("/podcasts/search", h.Podcast.Search)
	v1.GET("/podcasts/popular", h.Podcast.GetPopular)
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
	// アバターアップロードにはボディサイズ制限を設定（DoS 対策）
	// 画像最大 2MB + multipart ヘッダー分の余裕を持たせて 3MB に制限
	auth.POST("/users/me/avatar", h.User.UploadAvatar, middleware.BodyLimit("3M"))

	// Podcasts (認証必要)
	auth.POST("/podcasts/fetch-url", h.Podcast.FetchURL)

	// Episodes (認証必要)
	auth.POST("/podcasts/:id/episodes", h.Episode.Create)
	auth.POST("/podcasts/:id/episodes/fetch", h.Episode.FetchFromFeed)

	// Episodes (認証必要 - ユーザー固有)
	auth.GET("/users/me/recent-episodes", h.Episode.GetRecentEpisodes)

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

	// ── 管理用ルート（認証 + 管理者権限が必要） ──
	// AdminAuth ミドルウェアで、認証済みユーザーが管理者リストに含まれるかチェックする。
	// 管理者でない場合は 403 Forbidden が返される。
	admin := auth.Group("/admin", mw.AdminAuth(adminUserIDs))
	admin.POST("/podcasts", h.Admin.CreatePodcast)
	admin.POST("/podcasts/:id/episodes", h.Admin.CreateEpisode)
}
