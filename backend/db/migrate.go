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

// RunMigrations はデータベースに未適用のマイグレーションを適用します。
//
// 動作の流れ:
//  1. embed.FS から SQL ファイルを読み込む iofs ドライバーを作成
//  2. DSN（データベース接続文字列）を使って migrate インスタンスを作成
//  3. Up() で未適用のマイグレーションを全て実行
//  4. 全て適用済みの場合（ErrNoChange）は何もせずスキップ
//
// エラーが発生した場合はサーバー起動前に中断できるよう、エラーを返します。
func RunMigrations(databaseDSN string) error {
	// golang-migrate の pgx/v5 ドライバーは "pgx5://" スキームを要求する。
	// アプリケーション側の DSN は "postgres://" スキームなので、ここで変換する。
	migrateDSN := strings.Replace(databaseDSN, "postgres://", "pgx5://", 1)

	// iofs.New でembedしたファイルシステムからマイグレーションソースを作成
	// 第2引数の "migrations" はembed.FS内のディレクトリパス
	source, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("マイグレーションソースの作成に失敗: %w", err)
	}

	// migrate.NewWithSourceInstance で、ソース（SQL ファイル群）と
	// データベース接続先を指定してマイグレーターを作成
	// - 第1引数 "iofs": ソースドライバーの名前（ログ用の識別子）
	// - 第2引数 source: 上で作成した iofs ドライバー
	// - 第3引数 migrateDSN: "pgx5://user:pass@host:port/dbname?sslmode=disable" 形式の接続文字列
	m, err := migrate.NewWithSourceInstance("iofs", source, migrateDSN)
	if err != nil {
		return fmt.Errorf("マイグレーターの作成に失敗: %w", err)
	}
	// defer m.Close() でリソースを解放
	// Close() は (sourceErr, databaseErr) の2つのエラーを返す
	// Up() 自体は既に成否決定済みのため、Close 失敗は WARN に留める
	// （プロセスは続行されるがリソース解放の異常は記録する）
	defer func() {
		sourceErr, dbErr := m.Close()
		if sourceErr != nil {
			slog.Warn("migration source close failed", "error", sourceErr)
		}
		if dbErr != nil {
			slog.Warn("migration database close failed", "error", dbErr)
		}
	}()

	// Up() は未適用のマイグレーションを古い順に全て実行する
	// - 成功: nil を返す
	// - 全て適用済み: migrate.ErrNoChange を返す（エラーではない）
	// - 失敗: その他のエラーを返す
	err = m.Up()
	if err != nil {
		// errors.Is で特定のエラー型かどうかを判定する（Go のエラー比較のベストプラクティス）
		if errors.Is(err, migrate.ErrNoChange) {
			// ErrNoChange は「既に全て適用済み」を意味する正常系なので INFO レベル
			slog.Info("migrations already up to date (no change)")
			return nil
		}
		return fmt.Errorf("マイグレーションの実行に失敗: %w", err)
	}

	// 適用後のバージョンをログに出力
	version, dirty, verErr := m.Version()
	if verErr != nil {
		// 適用自体は成功しているが、バージョン情報が取れない異常を WARN で記録
		slog.Warn("migrations applied but version lookup failed", "error", verErr)
	} else {
		slog.Info("migrations applied", "version", version, "dirty", dirty)
	}

	return nil
}
