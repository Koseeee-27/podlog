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

// 環境名の定数。typo による設定ミスを防ぐため、文字列リテラルを直接書かず定数で比較する。
const (
	envDevelopment = "development"
	envProduction  = "production"
)

// Cloud Error Reporting が「エラー」として取り込むための @type フィールドの値。
// severity=ERROR だけでは Error Reporting に検知されないことがあるため、
// ERROR 以上のログにはこの @type を付けて自動検知を確実にする。
// https://cloud.google.com/error-reporting/docs/formatting-error-messages
const errorReportingType = "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent"

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

// errorReportingHandler は ERROR 以上のログに Cloud Error Reporting が必要とする
// @type フィールドを自動付与する slog.Handler ラッパー。
// Cloud Error Reporting は「severity=ERROR」だけでは検知せず、@type もしくは
// スタックトレース形式のメッセージが必要。本実装では最もシンプルな @type 付与を採用する。
type errorReportingHandler struct {
	slog.Handler
}

// Handle は slog.Handler インターフェースの実装。
// 各ログ出力時にレベルをチェックし、ERROR 以上なら @type 属性を追加してから
// ラップ先のハンドラ（JSONHandler）に委譲する。
func (h *errorReportingHandler) Handle(ctx context.Context, r slog.Record) error {
	if r.Level >= slog.LevelError {
		r.AddAttrs(slog.String("@type", errorReportingType))
	}
	return h.Handler.Handle(ctx, r)
}

// WithAttrs / WithGroup は slog.Handler のインターフェースを満たすために必要。
// ラップ先の戻り値を再度 errorReportingHandler で包んで返すことで、
// Logger.With(...) で派生させたロガーにも ERROR → @type 付与が引き継がれる。
func (h *errorReportingHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &errorReportingHandler{Handler: h.Handler.WithAttrs(attrs)}
}

func (h *errorReportingHandler) WithGroup(name string) slog.Handler {
	return &errorReportingHandler{Handler: h.Handler.WithGroup(name)}
}

// cloudLoggingReplaceAttr は slog.HandlerOptions.ReplaceAttr 用の関数。
// Cloud Logging の構造化ログ規約（https://cloud.google.com/logging/docs/structured-logging）
// に合わせて、slog の組み込みキーを Cloud Logging が「特別フィールド」として
// 認識する名前にリネームする。
//   - level   → severity （Cloud Logging UI でレベル別フィルタに使われる）
//   - time    → timestamp（LogEntry.timestamp の慣用名）
//   - msg     → message  （Cloud Logging UI のサマリー欄に昇格表示される）
//
// グループ配下の属性（例: httpRequest グループの requestMethod 等）は
// リネーム対象外。Cloud Logging 側の規約名をそのまま使うため。
func cloudLoggingReplaceAttr(groups []string, a slog.Attr) slog.Attr {
	if len(groups) > 0 {
		return a
	}
	switch a.Key {
	case slog.LevelKey:
		// 型アサーション失敗時にパニックしないようガードする。
		// 将来 slog の内部仕様が変わって Value が Level でなくなっても
		// ログ全体が落ちないようにする。
		level, ok := a.Value.Any().(slog.Level)
		if !ok {
			return a
		}
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
	case slog.TimeKey:
		a.Key = "timestamp"
	case slog.MessageKey:
		a.Key = "message"
	}
	return a
}

// setupLogger は環境に応じた slog.Logger を返す。
//   - envDevelopment: TextHandler（人間が読みやすい形式・DEBUG 以上）
//   - それ以外:       JSONHandler + errorReportingHandler（Cloud Logging 互換・INFO 以上）
//
// 本番 JSON Handler は Cloud Logging の構造化ログ規約に合わせてフィールドをリネームし、
// ERROR 以上には Cloud Error Reporting 用の @type を自動付与する。
// これにより Cloud Run の stdout に JSON を流すだけで、Cloud Logging がレベル別に
// 集約し、Cloud Error Reporting が ERROR を自動検知してくれる。
func setupLogger(env string) *slog.Logger {
	if env == envDevelopment {
		return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		}))
	}
	// 本番（envProduction）、またはそれ以外の未知値（envProduction 相当として扱う）。
	base := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level:       slog.LevelInfo,
		ReplaceAttr: cloudLoggingReplaceAttr,
	})
	return slog.New(&errorReportingHandler{Handler: base})
}

// run はアプリケーションの実際の起動処理を行う。
// エラーを返すことで、この関数内の defer（db.Close() 等）が
// 確実に実行されてからプロセスが終了する。
func run() error {
	// 0a. ロガーを暫定初期化（本番相当の JSON Handler）。
	// この時点では cfg.Environment がまだ取得できないため、まず本番同等のハンドラを
	// グローバル既定に設定しておき、config 読み込み後に development なら差し替える。
	// こうすることで godotenv.Load 失敗時・config 読み込み失敗時のログも slog に乗せられる。
	//
	// NOTE: この SetDefault より前に発生する致命エラー（pre-main の init 失敗等）は
	// slog パッケージの組み込みデフォルト（TextHandler to stderr）に流れる。
	slog.SetDefault(setupLogger(envProduction))

	// 0b. .env ファイルから環境変数を読み込み（存在しなくても OK）
	// godotenv.Load は .env ファイルの内容を OS の環境変数にセットする。
	// ファイルが存在しない場合（Docker 環境等）はエラーを無視する。
	if err := godotenv.Load(); err != nil {
		slog.Info(".env file not found, loading config from environment variables")
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
	e.HTTPErrorHandler = mw.NewHTTPErrorHandler(cfg.Environment == envDevelopment)

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
			//
			// Cloud Logging の特別フィールド `httpRequest` に揃えてグループ化することで、
			// Cloud Logging UI の「HTTP リクエスト」カラムに自動で表示され、ログ行単位の
			// 検索・集計がしやすくなる。
			// https://cloud.google.com/logging/docs/structured-logging
			//
			// `latency` は "1.234s" 形式の文字列で入れる（LogEntry.HttpRequest.latency の規約）。
			// Milliseconds() だと 1ms 未満のリクエストがすべて 0 になってしまうため、
			// time.Duration.String() で人間・機械ともに扱いやすい形式にする。
			slog.InfoContext(c.Request().Context(), "http_request",
				slog.Group("httpRequest",
					slog.String("requestMethod", v.Method),
					slog.String("requestUrl", v.URIPath),
					slog.Int("status", v.Status),
					slog.String("latency", v.Latency.String()),
				),
			)
			return nil
		},
	}))
	e.Use(mw.CORS(cfg.CORSAllowOrigins))

	// 6. Swagger UIを登録（開発環境のみ）
	// 本番環境では API の内部構造が外部に露出するのを防ぐため、
	// Swagger UI のルートを登録しない。
	if cfg.Environment == envDevelopment {
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
		slog.Warn("ADMIN_USER_IDS is not set; admin API is not accessible")
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

	// シャットダウンシグナルを受信するための context を作成
	// 起動ログ以降の slog.*Context 系はこの ctx を引き継げるよう、先に ctx を組み立ててから起動ログを出す。
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	slog.InfoContext(ctx, "starting server", "addr", addr, "env", cfg.Environment)

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
		slog.Info("shutdown signal received")
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
		slog.Error("server graceful shutdown failed", "error", err)
		errs = append(errs, fmt.Errorf("server graceful shutdown failed: %w", err))
	}

	// バックグラウンド goroutine の完了を待機（RSS フェッチ等）
	// RSS フェッチのタイムアウトが60秒なので、余裕を持って65秒で打ち切る
	const bgWaitTimeout = 65 * time.Second
	slog.Info("waiting for background tasks to complete")
	bgDone := make(chan struct{})
	go func() {
		bgWg.Wait()
		close(bgDone)
	}()
	select {
	case <-bgDone:
		slog.Info("all background tasks completed, exiting")
	case <-time.After(bgWaitTimeout):
		// タイムアウトは errs に追加されるため（非ゼロ exit code になる）、ERROR レベルで出力する。
		// timeout 属性は Duration のまま渡すと JSONHandler が ns 値で出力して読みにくいため、
		// .String() で "65s" のような人間に読みやすい表記にする。
		slog.Error("background task wait timed out", "timeout", bgWaitTimeout.String())
		errs = append(errs, fmt.Errorf("background task wait timed out (%v elapsed)", bgWaitTimeout))
	}

	// errors.Join はスライスが空（エラーなし）なら nil を返す。
	// 1つ以上のエラーがあれば結合して返し、main() が os.Exit(1) で終了する。
	return errors.Join(errs...)
}
