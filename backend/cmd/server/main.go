// Package main はアプリケーションのエントリーポイントです。
// ここで各コンポーネントの初期化（DI: Dependency Injection）と
// サーバーの起動を行います。

// @title Podlog API
// @version 1.0
// @description お笑いラジオの視聴記録SNS API
// @host localhost:8080
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

package main

import (
	"fmt"
	"log"

	"github.com/jmoiron/sqlx"
	dbmigrate "github.com/Koseeee-27/podlog/backend/db"
	"github.com/Koseeee-27/podlog/backend/internal/config"
	"github.com/Koseeee-27/podlog/backend/internal/external/ogp"
	"github.com/Koseeee-27/podlog/backend/internal/external/rss"
	"github.com/Koseeee-27/podlog/backend/internal/handler"
	mw "github.com/Koseeee-27/podlog/backend/internal/middleware"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
	"github.com/Koseeee-27/podlog/backend/internal/router"
	"github.com/Koseeee-27/podlog/backend/internal/storage"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	_ "github.com/lib/pq"

	_ "github.com/Koseeee-27/podlog/backend/docs"
	echoSwagger "github.com/swaggo/echo-swagger"
)

func main() {
	// 1. 設定を環境変数から読み込み
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	// 2. データベースに接続
	// DatabaseDSN() は net/url を使ってユーザー名・パスワードを安全にエスケープする
	db, err := sqlx.Connect("postgres", cfg.DatabaseDSN())
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	log.Println("Connected to database successfully")

	// 2.5. データベースマイグレーションを自動実行
	// サーバー起動前に未適用のマイグレーションを全て適用する。
	// schema_migrations テーブルで適用済みバージョンを追跡するため、
	// 既に適用済みのマイグレーションは再実行されない。
	if err := dbmigrate.RunMigrations(cfg.DatabaseDSN()); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	// 3. Echo インスタンスを作成
	e := echo.New()

	// 4. 基本ミドルウェアを登録
	e.Use(middleware.Recover())
	e.Use(middleware.Logger())
	e.Use(mw.CORS(cfg.CORSAllowOrigins))

	// 5. Swagger UIを登録
	e.GET("/swagger/*", echoSwagger.WrapHandler)

	// 6. 外部APIクライアントを初期化
	ogpScraper := ogp.NewScraper()
	rssClient := rss.NewClient()

	// 7. ストレージクライアントを初期化
	fileStorage := storage.NewSupabaseStorage(cfg.SupabaseURL, cfg.SupabaseServiceKey)

	// 8. DI: リポジトリ → ユースケース → ハンドラーの順に依存を注入
	userRepo := repository.NewUserRepository(db)
	podcastRepo := repository.NewPodcastRepository(db)
	episodeRepo := repository.NewEpisodeRepository(db)
	listeningRecordRepo := repository.NewListeningRecordRepository(db)
	reviewRepo := repository.NewReviewRepository(db)
	favoritePodcastRepo := repository.NewFavoritePodcastRepository(db)
	podcastRequestRepo := repository.NewPodcastRequestRepository(db)

	userUsecase := usecase.NewUserUsecase(userRepo, fileStorage)
	podcastUsecase := usecase.NewPodcastUsecase(podcastRepo)
	episodeUsecase := usecase.NewEpisodeUsecase(episodeRepo, rssClient)
	listeningRecordUsecase := usecase.NewListeningRecordUsecase(listeningRecordRepo, episodeRepo, userRepo)
	reviewUsecase := usecase.NewReviewUsecase(reviewRepo, episodeRepo, userRepo)
	favoritePodcastUsecase := usecase.NewFavoritePodcastUsecase(favoritePodcastRepo, userRepo, podcastRepo)
	podcastRequestUsecase := usecase.NewPodcastRequestUsecase(podcastRequestRepo)
	genreUsecase := usecase.NewGenreUsecase(podcastRepo)

	handlers := router.Handlers{
		Health:          handler.NewHealthHandler(),
		User:            handler.NewUserHandler(userUsecase),
		Podcast:         handler.NewPodcastHandler(podcastUsecase, reviewUsecase, ogpScraper),
		Episode:         handler.NewEpisodeHandler(episodeUsecase, podcastUsecase, reviewUsecase),
		ListeningRecord: handler.NewListeningRecordHandler(listeningRecordUsecase),
		Review:          handler.NewReviewHandler(reviewUsecase),
		FavoritePodcast: handler.NewFavoritePodcastHandler(favoritePodcastUsecase),
		PodcastRequest:  handler.NewPodcastRequestHandler(podcastRequestUsecase),
		Genre:           handler.NewGenreHandler(genreUsecase),
	}

	// 9. ルーティングを設定
	router.Setup(e, handlers, cfg.SupabaseURL)

	// 10. サーバーを起動
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Starting server on %s (env: %s)", addr, cfg.Environment)
	if err := e.Start(addr); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
