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
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/jmoiron/sqlx"
	dbmigrate "github.com/Koseeee-27/podlog/backend/db"
	"github.com/Koseeee-27/podlog/backend/internal/config"
	"github.com/Koseeee-27/podlog/backend/internal/external/itunes"
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

	// pgx/v5/stdlib は database/sql 互換の PostgreSQL ドライバー。
	// lib/pq の後継で、よりアクティブにメンテナンスされている。
	// 副作用インポートにより init() で "pgx" と "pgx/v5" の両方の名前で sql.Register される。
	// sqlx と組み合わせる場合は "pgx" を使うこと。"pgx/v5" は sqlx の BindType() が
	// 認識できず UNKNOWN を返すため、NamedExec 経由の ? → $N 変換（Rebind）が効かなくなる。
	_ "github.com/jackc/pgx/v5/stdlib"

	_ "github.com/Koseeee-27/podlog/backend/docs"
	echoSwagger "github.com/swaggo/echo-swagger"
)

// main は run() を呼び出し、エラーがあればログ出力して終了するだけの薄い関数。
// os.Exit() は main() でのみ呼ぶことで、run() 内の defer が確実に実行される。
// （slog には Fatal がないが、run() 内で os.Exit() を呼ぶと defer をスキップして
// 即座にプロセスが終了してしまうため、エラーを返して main() で os.Exit する）
func main() {
	if err := run(); err != nil {
		slog.Error("application failed", "error", err)
		os.Exit(1)
	}
}

// setupLogger は環境に応じた slog.Logger を返す。
//   - development: TextHandler（人間が読みやすい形式・DEBUG 以上）
//   - それ以外: JSONHandler（Cloud Logging 互換・INFO 以上）
//
// Cloud Logging の構造化ログ規約（https://cloud.google.com/logging/docs/structured-logging）に
// 合わせて、`level` → `severity`、`time` → `timestamp` にフィールド名を変換する。
// これにより Cloud Run の stdout に JSON を流すだけで、Cloud Logging がレベル別に
// 集約し、Cloud Error Reporting が ERROR を自動検知してくれる。
func setupLogger(env string) *slog.Logger {
	var handler slog.Handler
	if env == "development" {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})
	} else {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
			ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				// slog のデフォルトキー "level" を Cloud Logging が認識する "severity" に変換。
				// 値も slog.Level ("INFO", "WARN" 等) から Cloud Logging の severity 文字列
				// ("INFO", "WARNING", "ERROR", "DEBUG") に揃える。
				if a.Key == slog.LevelKey {
					level := a.Value.Any().(slog.Level)
					a.Key = "severity"
					switch {
					case level >= slog.LevelError:
						a.Value = slog.StringValue("ERROR")
					case level >= slog.LevelWarn:
						a.Value = slog.StringValue("WARNING")
					case level >= slog.LevelInfo:
						a.Value = slog.StringValue("INFO")
					default:
						a.Value = slog.StringValue("DEBUG")
					}
				}
				// slog のデフォルトキー "time" を Cloud Logging が認識する "timestamp" に変換。
				if a.Key == slog.TimeKey {
					a.Key = "timestamp"
				}
				return a
			},
		})
	}
	return slog.New(handler)
}

// run はアプリケーションの実際の起動処理を行う。
// エラーを返すことで、この関数内の defer（db.Close() 等）が
// 確実に実行されてからプロセスが終了する。
func run() error {
	// 0a. ロガーを暫定初期化（production 想定の JSON Handler）。
	// この時点では cfg.Environment がまだ取得できないため、まず本番同等のハンドラを
	// グローバル既定に設定しておき、config 読み込み後に development なら差し替える。
	// こうすることで godotenv.Load 失敗時・config 読み込み失敗時のログも slog に乗せられる。
	slog.SetDefault(setupLogger(""))

	// 0b. .env ファイルから環境変数を読み込み（存在しなくても OK）
	// godotenv.Load は .env ファイルの内容を OS の環境変数にセットする。
	// ファイルが存在しない場合（Docker 環境等）はエラーを無視する。
	if err := godotenv.Load(); err != nil {
		slog.Info(".env ファイルが見つかりません（環境変数から設定を読み込みます）")
	}

	// 1. 設定を環境変数から読み込み
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}
	// サーバー起動に必要な環境変数のバリデーション
	// バッチ（backfill-genre 等）では不要なため、Load() とは分離している
	if err := cfg.Validate(); err != nil {
		return fmt.Errorf("config validation failed: %w", err)
	}

	// 1.5. ロガーを環境に応じたものに差し替える
	// development なら TextHandler（DEBUG 以上）、それ以外は JSONHandler（INFO 以上）。
	// ここ以降のすべての slog.* 呼び出しがこのロガー経由で出力される。
	slog.SetDefault(setupLogger(cfg.Environment))

	// 2. データベースに接続（リトライあり）
	// Neon（サーバーレス PostgreSQL）はアイドル時にスリープするため、
	// 初回接続でコールドスタートの遅延が発生することがある。
	// 最大3回リトライして接続を試みる。
	var db *sqlx.DB
	const maxRetries = 3
	for i := range maxRetries {
		var err error
		db, err = sqlx.Connect("pgx", cfg.DatabaseDSN())
		if err == nil {
			break
		}
		if i == maxRetries-1 {
			return fmt.Errorf("failed to connect to database after %d attempts: %w", maxRetries, err)
		}
		slog.Warn("database connection failed, retrying",
			"attempt", i+1,
			"max_retries", maxRetries,
			"retry_in_seconds", (i+1)*2,
			"error", err,
		)
		time.Sleep(time.Duration((i+1)*2) * time.Second)
	}
	defer db.Close()

	// Neon（サーバーレス PostgreSQL）向けの接続プール設定:
	//
	// MaxOpenConns(10): 同時接続数の上限。Neon 無料枠のコネクション制限に合わせて控えめに。
	//
	// MaxIdleConns(5): アイドル（待機中）接続の数。
	//   以前は 2 だったが、リクエストのたびに新しい接続を作り直すコストが高かった。
	//   5 にすることで、一般的なリクエストパターン（同時 3-5 リクエスト）を
	//   既存の接続で処理でき、Neon への再接続によるレイテンシを削減する。
	//
	// ConnMaxLifetime(10分): 接続の最大生存時間。Neon 側のタイムアウトに対応。
	//
	// ConnMaxIdleTime(5分): アイドル接続を閉じるまでの時間。
	//   以前は 1 分だったが、Cloud Run のコールドスタート後すぐに接続が閉じられ、
	//   次のリクエストで再接続が必要になっていた。5 分に伸ばすことで、
	//   断続的なトラフィックでも接続を再利用できるようにする。
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(10 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)

	slog.Info("connected to database successfully")

	// 2.5. データベースマイグレーションを自動実行
	// サーバー起動前に未適用のマイグレーションを全て適用する。
	// schema_migrations テーブルで適用済みバージョンを追跡するため、
	// 既に適用済みのマイグレーションは再実行されない。
	if err := dbmigrate.RunMigrations(cfg.DatabaseDSN()); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// 3. Echo インスタンスを作成
	e := echo.New()

	// 4. カスタムエラーハンドラーを設定
	// ハンドラーから返されたエラーを型に応じて適切な HTTP レスポンスに変換する。
	// 開発環境では 500 エラーの詳細をレスポンスに含め、本番では隠す。
	e.HTTPErrorHandler = mw.NewHTTPErrorHandler(cfg.Environment == "development")

	// 5. 基本ミドルウェアを登録
	e.Use(middleware.Recover())
	// RequestLoggerWithConfig は非推奨の middleware.Logger() の代替。
	// リクエストごとにメソッド・URI・ステータスコード・レイテンシ・エラーをログ出力する。
	// HandleError: true にすると、エラーをグローバルエラーハンドラーに転送して
	// 適切なステータスコードを決定させる（カスタム HTTPErrorHandler と連携）。
	e.Use(middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
		LogMethod:   true,
		LogURIPath:  true,
		LogStatus:   true,
		LogLatency:  true,
		HandleError: true,
		LogValuesFunc: func(c echo.Context, v middleware.RequestLoggerValues) error {
			// エラー詳細は HTTPErrorHandler 側でログ出力するため、
			// ここではリクエスト概要（メソッド・パス・ステータス・レイテンシ）のみ記録する。
			// フィールドごとに属性化することで、Cloud Logging 上でクエリ・集計しやすくする。
			slog.InfoContext(c.Request().Context(), "http_request",
				"method", v.Method,
				"path", v.URIPath,
				"status", v.Status,
				"latency_ms", v.Latency.Milliseconds(),
			)
			return nil
		},
	}))
	e.Use(mw.CORS(cfg.CORSAllowOrigins))

	// 6. Swagger UIを登録（開発環境のみ）
	// 本番環境では API の内部構造が外部に露出するのを防ぐため、
	// Swagger UI のルートを登録しない。
	if cfg.Environment == "development" {
		e.GET("/swagger/*", echoSwagger.WrapHandler)
	}

	// 7. 外部APIクライアントを初期化
	itunesClient := itunes.NewClient()
	ogpScraper := ogp.NewScraper()
	rssClient := rss.NewClient()

	// 8. ストレージクライアントを初期化
	fileStorage := storage.NewSupabaseStorage(cfg.SupabaseURL, cfg.SupabaseServiceKey)

	// 9. DI: リポジトリ → ユースケース → ハンドラーの順に依存を注入
	userRepo := repository.NewUserRepository(db)
	podcastRepo := repository.NewPodcastRepository(db)
	episodeRepo := repository.NewEpisodeRepository(db)
	listeningRecordRepo := repository.NewListeningRecordRepository(db)
	reviewRepo := repository.NewReviewRepository(db)
	favoritePodcastRepo := repository.NewFavoritePodcastRepository(db)
	podcastRequestRepo := repository.NewPodcastRequestRepository(db)

	userUsecase := usecase.NewUserUsecase(userRepo, fileStorage)
	podcastUsecase := usecase.NewPodcastUsecase(podcastRepo, itunesClient)
	// バックグラウンド goroutine を追跡する WaitGroup（graceful shutdown 用）
	var bgWg sync.WaitGroup
	episodeUsecase := usecase.NewEpisodeUsecase(episodeRepo, podcastRepo, rssClient, &bgWg)
	listeningRecordUsecase := usecase.NewListeningRecordUsecase(listeningRecordRepo, episodeRepo, userRepo)
	reviewUsecase := usecase.NewReviewUsecase(reviewRepo, episodeRepo, userRepo)
	favoritePodcastUsecase := usecase.NewFavoritePodcastUsecase(favoritePodcastRepo, userRepo, podcastRepo)
	podcastRequestUsecase := usecase.NewPodcastRequestUsecase(podcastRequestRepo)
	genreUsecase := usecase.NewGenreUsecase(podcastRepo)

	adminUserIDs := cfg.GetAdminUserIDs()
	if len(adminUserIDs) > 0 {
		slog.Info("admin users configured", "count", len(adminUserIDs))
	} else {
		slog.Warn("ADMIN_USER_IDS が未設定です。管理用 API には誰もアクセスできません")
	}

	handlers := router.Handlers{
		Health:          handler.NewHealthHandler(db),
		User:            handler.NewUserHandler(userUsecase, adminUserIDs),
		Podcast:         handler.NewPodcastHandler(podcastUsecase, reviewUsecase, favoritePodcastRepo, ogpScraper),
		Episode:         handler.NewEpisodeHandler(episodeUsecase, podcastUsecase, reviewUsecase),
		ListeningRecord: handler.NewListeningRecordHandler(listeningRecordUsecase),
		Review:          handler.NewReviewHandler(reviewUsecase),
		FavoritePodcast: handler.NewFavoritePodcastHandler(favoritePodcastUsecase),
		PodcastRequest:  handler.NewPodcastRequestHandler(podcastRequestUsecase),
		Genre:           handler.NewGenreHandler(genreUsecase),
		Admin:           handler.NewAdminHandler(podcastUsecase, episodeUsecase),
	}

	// 10. ルーティングを設定
	// adminUserIDs は環境変数 ADMIN_USER_IDS をカンマ区切りでパースしたスライス
	if err := router.Setup(e, handlers, cfg.SupabaseURL, adminUserIDs); err != nil {
		return fmt.Errorf("failed to setup router: %w", err)
	}

	// 11. Graceful Shutdown 付きでサーバーを起動
	// SIGINT/SIGTERM を受信すると以下の順に処理する:
	//   1. 新規リクエストの受付を停止（Echo の Shutdown）
	//   2. バックグラウンド goroutine（RSS フェッチ等）の完了を待機（bgWg.Wait）
	//   3. サーバーを終了
	addr := fmt.Sprintf(":%s", cfg.Port)
	slog.Info("starting server", "addr", addr, "env", cfg.Environment)

	// シャットダウンシグナルを受信するための context を作成
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// サーバーを別 goroutine で起動し、エラーはチャネルで通知する。
	// goroutine 内でプロセスを終了させず、チャネル経由で run() に返すことで
	// defer が確実に実行される。
	serverErr := make(chan error, 1)
	go func() {
		if err := e.Start(addr); !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
		close(serverErr)
	}()

	// シャットダウンシグナル or サーバーエラーを待機
	select {
	case <-ctx.Done():
		slog.Info("シャットダウンシグナルを受信しました")
	case err := <-serverErr:
		if err != nil {
			return fmt.Errorf("failed to start server: %w", err)
		}
	}

	// シャットダウン中に発生したエラーを蓄積するスライス。
	// errors.Join() で結合し、1つでもエラーがあれば非ゼロ exit code で終了する。
	var errs []error

	// Echo サーバーの graceful shutdown（新規リクエストの受付停止 + 処理中リクエストの完了待ち）
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := e.Shutdown(shutdownCtx); err != nil {
		slog.Error("サーバーの graceful shutdown に失敗", "error", err)
		errs = append(errs, fmt.Errorf("サーバーの graceful shutdown に失敗: %w", err))
	}

	// バックグラウンド goroutine の完了を待機（RSS フェッチ等）
	// RSS フェッチのタイムアウトが60秒なので、余裕を持って65秒で打ち切る
	const bgWaitTimeout = 65 * time.Second
	slog.Info("バックグラウンドタスクの完了を待機中...")
	bgDone := make(chan struct{})
	go func() {
		bgWg.Wait()
		close(bgDone)
	}()
	select {
	case <-bgDone:
		slog.Info("全タスク完了。サーバーを終了します")
	case <-time.After(bgWaitTimeout):
		// タイムアウトは errs に追加されるため（非ゼロ exit code になる）、ERROR レベルで出力する
		slog.Error("バックグラウンドタスクの待機がタイムアウトしました", "timeout", bgWaitTimeout)
		errs = append(errs, fmt.Errorf("バックグラウンドタスクの待機がタイムアウトしました（%v経過）", bgWaitTimeout))
	}

	// errors.Join はスライスが空（エラーなし）なら nil を返す。
	// 1つ以上のエラーがあれば結合して返し、main() が os.Exit(1) で終了する。
	return errors.Join(errs...)
}
