// Package router はアプリケーションのルーティング定義を一箇所にまとめます。
// Echo のグループ機能を使って /api/v1 プレフィックスでAPIをバージョニングします。
package router

import (
	"fmt"

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
	Sitemap         *handler.SitemapHandler
	Admin           *handler.AdminHandler
}

// Setup は全ルートを Echo インスタンスに登録します。
// supabaseURL は Supabase プロジェクトの URL（例: https://xxx.supabase.co）です。
// JWKS エンドポイントから公開鍵を取得して JWT 検証に使います。
// adminUserIDs は管理者ユーザー ID のリストです。/admin API へのアクセスを制限します。
// sitemapAPIToken は sitemap 用内部 API の Bearer トークンです（FE と共有する pre-shared token）。
// isDev は開発環境かどうかのフラグで、true のときは SitemapAuth が認証を素通しします。
func Setup(e *echo.Echo, h Handlers, supabaseURL string, adminUserIDs []string, sitemapAPIToken string, isDev bool) error {
	// JWKS keyfunc を 1 回だけ初期化し、全ミドルウェアで共有する。
	// これにより JWKS のキャッシュ・バックグラウンドリフレッシュ goroutine が 1 つだけになる。
	jwksKeyfunc, err := mw.NewJWKSKeyfunc(supabaseURL)
	if err != nil {
		return fmt.Errorf("failed to initialize JWKS keyfunc: %w", err)
	}

	// タイムアウトが異なるため、同じプレフィックスで2つのグループを作成する。
	// context.WithTimeout は親コンテキストのデッドラインを超えられないため、
	// 外部通信を含むエンドポイントは別グループに分離する必要がある。
	//
	// ミドルウェアの適用順序: レート制限 → タイムアウト の順で評価する。
	// Echo のグループミドルウェアは Group(prefix, mw1, mw2, ...) で渡した順に
	// 外側から適用されるため、先頭に RateLimiter を置くことで
	// 拒否されたリクエストに対してタイムアウトコンテキスト生成のコストを払わずに済む。
	//
	// 公開エンドポイント: 60 req/min/IP（平均 1 req/sec）、burst 20 まで許容
	v1 := e.Group("/api/v1",
		mw.NewRateLimiter(60, 20),
		mw.Timeout(mw.DefaultTimeout),
	)
	// 外部通信を含む公開エンドポイント: 20 req/min/IP、burst 5 まで許容（厳しめ）
	// iTunes API のレート制限や外部サービスへの負荷を考慮して絞る
	v1Ext := e.Group("/api/v1",
		mw.NewRateLimiter(20, 5),
		mw.Timeout(mw.ExternalTimeout),
	)

	// ── ヘルスチェック（ルート直下） ──
	// /api/v1 プレフィックスの外に配置する理由:
	// - ヘルスチェックは API バージョニングの対象ではない
	// - Cloud Run のデフォルト HTTP probe パスは "/" に近いシンプルなパスが推奨される
	// - タイムアウトミドルウェア（30秒）を適用せず、ハンドラー内の専用タイムアウト（3秒）で制御する
	e.GET("/health", h.Health.Check)

	// ── 認証不要のルート（デフォルトタイムアウト: 30秒） ──

	// Users (公開)
	v1.GET("/users/:username", h.User.GetPublicProfile)
	v1.GET("/users/:username/listening-records", h.ListeningRecord.GetUserListeningRecords)
	v1.GET("/users/:username/reviews", h.Review.GetUserReviews)
	v1.GET("/users/:username/favorite-podcasts", h.FavoritePodcast.GetUserFavoritePodcasts)

	// Genres (公開)
	v1.GET("/genres", h.Genre.ListGenres)

	// Podcasts (公開)
	v1.GET("/podcasts/popular", h.Podcast.GetPopular)
	v1.GET("/podcasts/:id", h.Podcast.GetByID)

	// ── オプショナル認証ルート ──
	// 未認証でもアクセス可能だが、認証済みの場合は追加情報（聴取状態など）を返す
	optionalAuth := v1.Group("", mw.OptionalJWTAuth(jwksKeyfunc))
	optionalAuth.GET("/podcasts/:id/episodes", h.Episode.GetByPodcastID)
	optionalAuth.GET("/episodes/:id", h.Episode.GetByID)

	// Episodes (公開)
	v1.GET("/episodes/:id/reviews", h.Review.GetByEpisodeID)

	// Podcasts 評価 (公開)
	v1.GET("/podcasts/:id/rating", h.Review.GetPodcastRating)

	// Timeline (公開)
	v1.GET("/timeline", h.Review.GetTimeline)

	// Sitemap（内部 API: Bearer トークン認証）
	//
	// FE の app/sitemap.ts からのみ呼ばれる軽量 API。全件返すためページングなし。
	// 現状の規模（podcasts ~700 件 / episodes ~2000 件）では DB 負荷も軽微。
	// 将来 episodes が 10 万件オーダーに増えたら sitemap index 化（分割）を検討する。
	//
	// sitemap.xml 自体は最終的にクローラーに公開されるが、データソース API を
	// そのまま公開すると以下のリスクがあるため、共有秘密の Bearer トークンで保護する:
	//   - /sitemap/users で全ユーザーの username が 1 リクエストで列挙可能
	//   - 全 podcast / episode の ID リストが 1 リクエストでスクレイピング可能
	//
	// dev では SitemapAuth が isDev=true で素通しするため、ローカル開発時は
	// FE 側もヘッダー無しで動作する。
	sitemap := v1.Group("/sitemap", mw.SitemapAuth(sitemapAPIToken, isDev))
	sitemap.GET("/podcasts", h.Sitemap.GetPodcasts)
	sitemap.GET("/episodes", h.Sitemap.GetEpisodes)
	sitemap.GET("/users", h.Sitemap.GetUsers)

	// ── 認証不要 + 外部通信を含むルート（タイムアウト: 60秒） ──
	// iTunes API への検索リクエストを含む
	v1Ext.GET("/podcasts/search", h.Podcast.Search)

	// ── 認証が必要なルート（デフォルトタイムアウト: 30秒） ──
	auth := v1.Group("", mw.JWTAuth(jwksKeyfunc))

	// Users (認証必要)
	auth.POST("/users/profile", h.User.CreateProfile)
	auth.GET("/users/me", h.User.GetMyProfile)
	auth.PUT("/users/me", h.User.UpdateMyProfile)
	// アバターアップロードにはボディサイズ制限を設定（DoS 対策）
	// 画像最大 2MB + multipart ヘッダー分の余裕を持たせて 3MB に制限
	auth.POST("/users/me/avatar", h.User.UploadAvatar, middleware.BodyLimit("3M"))

	// Episodes (認証必要)
	auth.POST("/podcasts/:id/episodes", h.Episode.Create)

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

	// ── 認証が必要 + 外部通信を含むルート（タイムアウト: 60秒） ──
	authExt := v1Ext.Group("", mw.JWTAuth(jwksKeyfunc))
	// OGP 取得のため外部通信を含む
	authExt.POST("/podcasts/fetch-url", h.Podcast.FetchURL)
	// RSS フィード取得のため外部通信を含む
	authExt.POST("/podcasts/:id/episodes/fetch", h.Episode.FetchFromFeed)

	// ── 管理用ルート（認証 + 管理者権限が必要） ──
	// AdminAuth ミドルウェアで、認証済みユーザーが管理者リストに含まれるかチェックする。
	// 管理者でない場合は 403 Forbidden が返される。
	admin := auth.Group("/admin", mw.AdminAuth(adminUserIDs))
	admin.POST("/podcasts", h.Admin.CreatePodcast)
	admin.POST("/podcasts/:id/episodes", h.Admin.CreateEpisode)

	return nil
}
