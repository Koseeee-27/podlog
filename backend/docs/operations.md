# 運用ガイド

バックエンドの運用に関する設定手順をまとめる。

## ログ監視（Cloud Logging + Cloud Error Reporting）

### 構造化ログの仕組み

`cmd/server/main.go` は Go 標準の `log/slog` を使って構造化ログを stdout に出力する。

| 環境 | 出力形式 | レベル |
|---|---|---|
| `APP_ENV=development` | `TextHandler`（人間が読みやすいテキスト） | DEBUG 以上 |
| それ以外（本番） | `JSONHandler`（Cloud Logging 互換の JSON） | INFO 以上 |

本番では [Cloud Logging の構造化ログ規約](https://cloud.google.com/logging/docs/structured-logging) に合わせて、slog の組み込みキーを Cloud Logging が「特別フィールド」として認識する名前に変換している:

| slog の既定キー | 変換後 | 役割 |
|---|---|---|
| `level` | `severity` | Cloud Logging UI でレベル別フィルタに使われる（値も `INFO` / `WARNING` / `ERROR` / `DEBUG` に揃える） |
| `time` | `timestamp` | `LogEntry.timestamp` の慣用名に揃える（`time` でも動作するが慣例に合わせる） |
| `msg` | `message` | Cloud Logging UI のサマリー欄に本文として昇格表示される。`msg` のままだと `jsonPayload.msg` にネストされ、Summary 欄が空になる |

さらに、ERROR 以上のレベルで出力されるログには、カスタムハンドラ (`errorReportingHandler`) が以下の属性を自動付与する:

- `@type` = `type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent`

これにより Cloud Error Reporting は severity と @type を見てエラーを自動集約できる。
参考: [Format errors in logs](https://cloud.google.com/error-reporting/docs/formatting-error-messages)

Cloud Run は stdout の JSON を Cloud Logging に自動取り込みし、`severity` / `message` / `@type` を使ってレベル別検索・エラー自動集約ができる。

### HTTP リクエストログ

リクエストごとのサマリーログは `httpRequest` グループで出力している。Cloud Logging は `jsonPayload.httpRequest` を [`LogEntry.HttpRequest`](https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#httprequest) として解釈するため、UI の「HTTP リクエスト」カラムにメソッド・パス・ステータス・レイテンシが自動表示される。

```json
{
  "severity": "INFO",
  "message": "http_request",
  "httpRequest": {
    "requestMethod": "GET",
    "requestUrl": "/api/v1/podcasts",
    "status": 200,
    "latency": "0.012345000s"
  }
}
```

> **重要**: `latency` は protobuf Duration JSON 形式（秒単位 + `s` サフィックス、ナノ秒精度まで小数 9 桁）で出力する必要がある。`time.Duration.String()` は 1 秒未満で `"12.345ms"` / `"500µs"` / `"50ns"` を返すため規約違反になり、Cloud Logging が HTTP リクエストフィールドとして認識しなくなる。podlog バックエンドは `formatProtoDurationJSON` ヘルパーで `fmt.Sprintf("%.9fs", d.Seconds())` を使って規約通りに出力している。

### Cloud Logging での確認手順

デプロイ後、以下を確認する。

1. Cloud Run コンソール → 対象サービス → 「ログ」タブ
2. 出力されたログを展開し、`severity` フィールドが `INFO` / `WARNING` / `ERROR` いずれかで埋まっていることを確認
3. UI のサマリー行に `message` の内容が表示されていることを確認（`jsonPayload.msg` として隠れていないこと）
4. 検索バーで以下のクエリを試す:
   ```text
   resource.type="cloud_run_revision"
   resource.labels.service_name="<サービス名>"
   severity="ERROR"
   ```
   ERROR レベルのログのみがフィルタされればセットアップ成功。

### Cloud Error Reporting の通知設定

Cloud Error Reporting は、ログに `@type` フィールドが付与されていれば、スタックトレース有無に関わらずエラーイベントとして集約する。podlog バックエンドは `errorReportingHandler` が ERROR 以上のログに `@type` を自動付与するため、`slog.Error(msg, "error", err)` の形で書くだけで Error Reporting のダッシュボードに現れる。

> **注意**: Cloud Error Reporting の検知は `severity=ERROR` だけでは不十分。`@type` もしくはスタックトレース形式のメッセージが必要。podlog では `@type` 付与方式を採用している。Error Reporting のダッシュボードに出ないときはまず `@type` が JSON ログに含まれているかを確認する。

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

### メッセージの書き方

- **slog のメッセージ本文は英語**（`slog.Info("starting server", ...)` のように半角小文字英語）
  - Cloud Logging の UI が英語ベースで、日英混在すると視覚的にノイズになる
  - Error Reporting のエラーグルーピングは文字列パターンを使うため、同一イベントは同一文言で揃える必要がある
  - Go 標準ライブラリ・主要 OSS ライブラリのエラー文字列と整合させるため
- **ユーザー向けエラーレスポンス（`{"error": "..."}`）は日本語のまま**（仕様として `api-design.md` に記載された通り）
- **ソース内コメント・docs は日本語のまま**

## トラブルシュート

### JSON ログの `severity` / `message` が表示されない

- `APP_ENV=development` のまま本番デプロイしていないか確認する。本番では `APP_ENV` を未設定または `production` にする（`setupLogger` で `development` 以外はすべて JSON 出力になる）
- `slog.SetDefault` が呼ばれる前のログ（`run()` 冒頭より前に発生する致命エラー）は slog パッケージの組み込みデフォルト（TextHandler to stderr）に流れる。通常は pre-main の init 失敗のみが該当する

### Cloud Error Reporting に ERROR が検知されない

- JSON ログに `"@type": "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent"` が含まれているか確認する（含まれていなければ `errorReportingHandler` がロガーに組み込まれていない可能性がある）
- `severity` が `ERROR` になっているか確認する（`WARNING` は検知対象外）
- Error Reporting のフィルタで対象サービス・期間が合っているか確認する
