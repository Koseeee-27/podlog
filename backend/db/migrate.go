// Package db はデータベースのマイグレーション機能を提供します。
//
// Go の embed パッケージを使って、migrations/ ディレクトリ内の SQL ファイルを
// バイナリに埋め込みます。これにより、デプロイ時にマイグレーションファイルを
// 別途コピーする必要がなくなります。
//
// golang-migrate ライブラリを使用し、schema_migrations テーブルで
// どのマイグレーションまで適用済みかを追跡します。
package db

import (
	"embed"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	// iofs はGoのio/fsインターフェースを使ってマイグレーションファイルを読み込むドライバー
	"github.com/golang-migrate/migrate/v4/source/iofs"
	// pgx/v5 用のデータベースドライバー（副作用インポート）
	// lib/pq ベースの "postgres" ドライバーから pgx/v5 ベースに移行。
	// init() 関数で "pgx5" スキームのドライバーが登録される。
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
)

// //go:embed は Go のコンパイラディレクティブ（特別なコメント）です。
// ビルド時に migrations/ ディレクトリ内の全ファイルをバイナリに埋め込みます。
// 実行時にファイルシステムにアクセスする必要がなくなるため、Docker コンテナでも
// ローカル実行でも同じように動作します。
//
//go:embed migrations/*.sql
var migrationsFS embed.FS

// newMigrator は embed されたマイグレーションファイルと DSN から *migrate.Migrate を作成します。
// 呼び出し側で defer closeMigrator(m) を行うこと。
//
// golang-migrate の pgx/v5 ドライバーは "pgx5://" スキームを要求する。
// アプリケーション側の DSN は "postgres://" スキームなので、ここで変換する。
func newMigrator(databaseDSN string) (*migrate.Migrate, error) {
	migrateDSN := strings.Replace(databaseDSN, "postgres://", "pgx5://", 1)

	// iofs.New でembedしたファイルシステムからマイグレーションソースを作成
	// 第2引数の "migrations" はembed.FS内のディレクトリパス
	source, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return nil, fmt.Errorf("マイグレーションソースの作成に失敗: %w", err)
	}

	// migrate.NewWithSourceInstance で、ソース（SQL ファイル群）と
	// データベース接続先を指定してマイグレーターを作成
	// - 第1引数 "iofs": ソースドライバーの名前（ログ用の識別子）
	// - 第2引数 source: 上で作成した iofs ドライバー
	// - 第3引数 migrateDSN: "pgx5://user:pass@host:port/dbname?sslmode=disable" 形式の接続文字列
	m, err := migrate.NewWithSourceInstance("iofs", source, migrateDSN)
	if err != nil {
		return nil, fmt.Errorf("マイグレーターの作成に失敗: %w", err)
	}
	return m, nil
}

// closeMigrator は *migrate.Migrate のリソースを解放します。
// Close() は (sourceErr, databaseErr) の2つのエラーを返す。
// 上位処理は既に成否確定済みのため、Close 失敗は WARN に留める。
func closeMigrator(m *migrate.Migrate) {
	sourceErr, dbErr := m.Close()
	if sourceErr != nil {
		slog.Warn("migration source close failed", "error", sourceErr)
	}
	if dbErr != nil {
		slog.Warn("migration database close failed", "error", dbErr)
	}
}

// logVersion は現在のマイグレーションバージョンを INFO ログに出力します。
// バージョン取得自体に失敗した場合は WARN で記録するが、処理は続行する。
func logVersion(m *migrate.Migrate, msg string) {
	version, dirty, verErr := m.Version()
	if verErr != nil {
		// migrate.ErrNilVersion はバージョンレコードがない（適用済み 0 件）状態を意味する。
		// ロールバックで全マイグレーションを巻き戻した直後など、エラーではなく正常系。
		if errors.Is(verErr, migrate.ErrNilVersion) {
			slog.Info(msg, "version", "none")
			return
		}
		slog.Warn(msg+" but version lookup failed", "error", verErr)
		return
	}
	slog.Info(msg, "version", version, "dirty", dirty)
}

// RunMigrations はデータベースに未適用のマイグレーションを全て適用します。
//
// 動作の流れ:
//  1. newMigrator で migrate インスタンスを作成
//  2. Up() で未適用のマイグレーションを全て実行
//  3. 全て適用済みの場合（ErrNoChange）は何もせずスキップ
//
// エラーが発生した場合はサーバー起動前に中断できるよう、エラーを返します。
func RunMigrations(databaseDSN string) error {
	m, err := newMigrator(databaseDSN)
	if err != nil {
		return err
	}
	defer closeMigrator(m)

	// Up() は未適用のマイグレーションを古い順に全て実行する
	// - 成功: nil を返す
	// - 全て適用済み: migrate.ErrNoChange を返す（エラーではない）
	// - 失敗: その他のエラーを返す
	if err := m.Up(); err != nil {
		// errors.Is で特定のエラー型かどうかを判定する（Go のエラー比較のベストプラクティス）
		if errors.Is(err, migrate.ErrNoChange) {
			// ErrNoChange は「既に全て適用済み」を意味する正常系なので INFO レベル
			slog.Info("migrations already up to date (no change)")
			return nil
		}
		return fmt.Errorf("マイグレーションの実行に失敗: %w", err)
	}

	// 適用後のバージョンをログに出力
	logVersion(m, "migrations applied")
	return nil
}

// RollbackMigration は最新の適用済みマイグレーションを 1 ステップだけロールバックします。
// ローカルでの動作確認（make migrate-down）で使う想定。
//
// Steps(-1) は「現在のバージョンから 1 つ前に戻す」操作で、対応する .down.sql を実行する。
// 全て巻き戻したい場合は呼び出し側で複数回実行するか、別途 Down() を呼ぶ用の関数を追加する。
func RollbackMigration(databaseDSN string) error {
	m, err := newMigrator(databaseDSN)
	if err != nil {
		return err
	}
	defer closeMigrator(m)

	// Steps(-1) は 1 つ前のバージョンに戻す。
	// 適用済み 0 件の状態から呼ぶと migrate.ErrNoChange を返す（正常系として扱う）。
	if err := m.Steps(-1); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			slog.Info("no migrations to rollback")
			return nil
		}
		return fmt.Errorf("マイグレーションのロールバックに失敗: %w", err)
	}

	logVersion(m, "migration rolled back")
	return nil
}
