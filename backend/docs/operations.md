# 運用ガイド

バックエンドの運用に関する設定手順をまとめる。

## ログ監視（Cloud Logging + Cloud Error Reporting）

### 構造化ログの仕組み

`cmd/server/main.go` は Go 標準の `log/slog` を使って構造化ログを stdout に出力する。

| 環境 | 出力形式 | レベル |
|---|---|---|
| `APP_ENV=development` | `TextHandler`（人間が読みやすいテキスト） | DEBUG 以上 |
| それ以外（本番） | `JSONHandler`（Cloud Logging 互換の JSON） | INFO 以上 |

本番では [Cloud Logging の構造化ログ規約](https://cloud.google.com/logging/docs/structured-logging) に合わせて以下のフィールド名に変換している:

- `level` → `severity`（`INFO` / `WARNING` / `ERROR` / `DEBUG`）
- `time` → `timestamp`

Cloud Run は stdout の JSON を Cloud Logging に自動取り込みし、`severity` フィールドを使ってレベル別の検索・集計ができる。

### Cloud Logging での確認手順

デプロイ後、以下を確認する。

1. Cloud Run コンソール → 対象サービス → 「ログ」タブ
2. 出力されたログを展開し、`severity` フィールドが `INFO` / `WARNING` / `ERROR` いずれかで埋まっていることを確認
3. 検索バーで以下のクエリを試す:
   ```
   resource.type="cloud_run_revision"
   resource.labels.service_name="<サービス名>"
   severity="ERROR"
   ```
   ERROR レベルのログのみがフィルタされればセットアップ成功。

### Cloud Error Reporting の通知設定

Cloud Error Reporting は Cloud Logging の `severity=ERROR` 以上かつエラーのスタックトレース/メッセージパターンを持つログを自動集約する。podlog バックエンドは `slog.Error(msg, "error", err)` の形でエラーを出力するため、特別な設定なしで Error Reporting に取り込まれる。

#### 通知チャンネルの作成

1. GCP コンソール → 「Error Reporting」 → 「通知」→ 「通知チャンネルを管理」
2. 通知手段を選択して追加:
   - **Email**（まずはこれで十分）
   - **Slack**（チーム運用時）
   - **Pub/Sub**（Lambda 連携等）
3. 通知チャンネルを保存

#### 通知ルール

Error Reporting の「Notifications」設定で、以下のタイミングで通知するよう設定する:

| タイミング | 用途 |
|---|---|
| 新規エラーの発生時（First occurrence） | 初めて出たエラーを即座に検知 |
| エラーの再発時（Reopens） | 一度解決したエラーがまた出た場合に検知 |

頻発エラーの通知スパムを避けるため、最初は「新規発生のみ通知」にして運用しながら調整する。

### ログレベルの使い分け

本プロジェクトでは以下の基準で slog のレベルを使い分ける:

| レベル | 用途 | 例 |
|---|---|---|
| `slog.Debug` | 開発時のトレース情報 | クエリの詳細、ループ回数 |
| `slog.Info` | 正常系イベント | サーバー起動、DB 接続成功、リクエストログ |
| `slog.Warn` | 異常ではないが注意が必要 | DB 接続リトライ中、ADMIN_USER_IDS 未設定 |
| `slog.Error` | 障害・要調査 | shutdown 失敗、バックグラウンドタスクのタイムアウト |

**Error Reporting に通知させたくない警告は必ず `Warn` を使う**。`Error` を乱用すると通知スパムの原因になる。

## トラブルシュート

### JSON ログの `severity` が表示されない

- `APP_ENV=development` のまま本番デプロイしていないか確認する。本番では `APP_ENV` を未設定または `production` にする（`config.Load()` で `development` 以外はすべて JSON 出力になる）
- `slog.SetDefault` が呼ばれる前のログ（`main()` 関数内のごく初期）は何も出力されないことに留意する（podlog バックエンドでは `run()` 冒頭で `slog.SetDefault` を呼んでいるため、実際に問題になるのは pre-main 起動エラーのみ）
