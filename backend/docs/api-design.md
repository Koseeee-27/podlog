# API 設計書

## 共通仕様

- **ベースパス**: `/api/v1`
- **形式**: JSON
- **認証**: Supabase JWT を `Authorization: Bearer <token>` ヘッダーで送信
- **エラーレスポンス**: `{ "error": "メッセージ" }`
- **ページネーション**: `limit`（デフォルト 20、上限 100）+ `offset`（デフォルト 0）をクエリパラメータで指定。`limit` が 0 以下または 100 超の場合はデフォルト 20 に補正される

### レート制限

クライアント IP アドレス単位で、`/api/v1` 配下の全エンドポイントにレート制限を適用する。DoS 対策・外部サービス（iTunes API 等）への過剰リクエスト抑制が目的。

| 対象グループ | 制限値 | バースト | 該当エンドポイント例 |
|---|---|---|---|
| 通常エンドポイント | **60 req/min/IP** | 20 | `/podcasts/:id`, `/episodes/:id`, `/timeline`, 認証系 API 全般 |
| 外部通信を含むエンドポイント | **20 req/min/IP** | 5 | `/podcasts/search`（iTunes フォールバック有）, `/podcasts/fetch-url`, `/podcasts/:id/episodes/fetch` |

- **識別子**: `echo.Context.RealIP()` で取得する IP アドレス
  - `cmd/server/main.go` で `e.IPExtractor = echo.ExtractIPFromXFFHeader(echo.TrustLoopback(true), echo.TrustPrivateNet(true))` を設定している
  - これにより `X-Forwarded-For` の **右端から trust 対象（loopback / プライベート IP）をスキップして、最初に現れた untrusted なクライアント IP** を返す
  - Cloud Run 前段の Google Front End / LB のプライベート IP は自動的に trust されるため、**クライアントが XFF の先頭に偽装値を入れてもバケット回避はできない**
  - Echo のデフォルト (IPExtractor 未設定) の `RealIP()` は XFF の先頭をそのまま返す legacy behavior に落ちるため、**必ず IPExtractor を明示設定する**
  - **例外ケース**: XFF チェーン上の全要素が trust 対象（全てプライベート IP / loopback）のとき、`ExtractIPFromXFFHeader` は XFF の **先頭要素**をフォールバックで返す。Cloud Run 本番では通常パブリック IP を介するため発生しないが、内部ネットワーク経由の負荷試験・社内プロキシ・VPN 経由のアクセスでは先頭要素（偽装可能）が識別子になる可能性がある
- **アルゴリズム**: トークンバケット（`golang.org/x/time/rate.Limiter`）。平均レート（req/sec）でトークンが補充され、バケット容量（バースト）まで貯められる
- **ストア**: プロセスメモリ（in-memory）。非アクティブな IP エントリは 3 分で自動削除
- **除外**: `/health`（ヘルスチェックは `/api/v1` 外にあるため対象外）

#### レート超過時のレスポンス

```http
HTTP/1.1 429 Too Many Requests
Retry-After: <秒数>
Content-Type: application/json

{ "error": "rate limit exceeded" }
```

- `Retry-After` は「次のトークンが補充されるまでの秒数」を `ceil(60 / reqPerMin)` で算出した整数秒（最小 1 秒）
  - 通常エンドポイント（60 req/min）→ **`Retry-After: 1`**
  - 外部通信エンドポイント（20 req/min）→ **`Retry-After: 3`**
- クライアントは `Retry-After` ヘッダの秒数を待機してから再試行すること

#### 拒否時のログ

レート超過時は `slog` の **WARN レベル**で以下の構造化ログを出力する:

| キー | 内容 |
|---|---|
| `method` | HTTP メソッド |
| `path` | 実際のリクエストパス（例: `/api/v1/podcasts/123`）。プロジェクト内の他のログ（`errorhandler.go` 等）とキー粒度を揃えるため実パスを入れる |
| `route` | ルートパターン（例: `/podcasts/:id`） |
| `identifier_hash` | クライアント IP の SHA-256 先頭 8 文字。PII (生 IP) を残さず、同一クライアントかの同定は可能にする折衷 |
| `retry_after` | Retry-After に返した秒数 |

運用中に同じ `identifier_hash` で WARN が頻発する場合、DoS / 自動化スクリプトの可能性がある。Cloud Logging のフィルタ (`jsonPayload.identifier_hash="..."`) で追跡できる。

#### IP が抽出できなかった場合

`c.RealIP()` が空文字を返すケース（`RemoteAddr` も XFF も両方空、等の異常系）では `IdentifierExtractor` がエラーを返し、`400 Bad Request` が返される。全リクエストが「空文字キー」という単一バケットに集約される副作用を防ぐため。

#### 設計上の注意（運用者向け）

- **Cloud Run の autoscale 時は実効レートが「設定値 × インスタンス数」になる**。in-memory ストアはインスタンスごとに独立するため、複数インスタンス稼働時は同一 IP でもインスタンスごとに別バケットが割り当てられる。MVP 段階のトラフィック規模では許容するが、運用で問題が顕在化したら Redis / Cloud Memorystore などの分散ストア化を検討する
- **認証必須ルート（`auth` グループ）も `v1` / `v1Ext` を親に持つため自動的にレート制限対象**。JWT 検証が通るリクエストは 1 ユーザーあたり少数なので実害はない想定
- 認証必須ルートでのミドルウェアの適用順序は **レート制限 → タイムアウト → JWT 検証** の順。拒否されたリクエストで不要なコスト（タイムアウトコンテキストの生成・JWT 検証）を払わないようにしている
- **外部 LB（パブリック IP を持つ構成）を挟む場合は要追加設定**: `echo.ExtractIPFromXFFHeader` の `TrustIPRange` で LB の IP レンジを明示的に trust する必要がある。さもないと LB 自身が untrusted な IP として識別子になり、全リクエストが同一バケットに集約される

---

## エンドポイント一覧

### ヘルスチェック


| メソッド | パス        | 認証  | 説明       | 状態   |
| ---- | --------- | --- | -------- | ---- |
| GET  | `/health` | 不要  | サーバー稼働確認 | 実装済み |


### Users


| メソッド | パス                                    | 認証  | 説明                 | 状態   |
| ---- | ------------------------------------- | --- | ------------------ | ---- |
| POST | `/users/profile`                      | 必要  | 初回プロフィール作成         | 実装済み |
| GET  | `/users/me`                           | 必要  | 自分のプロフィール取得        | 実装済み |
| PUT  | `/users/me`                           | 必要  | プロフィール更新（表示名・自己紹介） | 実装済み |
| POST | `/users/me/avatar`                    | 必要  | アバター画像アップロード       | 実装済み |
| GET  | `/users/{username}`                   | 不要  | 公開プロフィール取得         | 実装済み |
| GET  | `/users/{username}/listening-records` | 不要  | ユーザーの聴取履歴一覧（公開）    | 実装済み |
| GET  | `/users/{username}/ratings/stats`     | 不要  | ユーザーの評価統計サマリー（公開） | 未実装 |
| GET  | `/users/{username}/comments`          | 不要  | ユーザーの感想一覧（公開）      | 未実装 |


### Favorite Podcasts（好きな番組）


| メソッド | パス                                    | 認証  | 説明               | 状態  |
| ---- | ------------------------------------- | --- | ---------------- | --- |
| GET  | `/users/{username}/favorite-podcasts` | 不要  | ユーザーの好きな番組一覧（公開） | 実装済み |
| PUT  | `/users/me/favorite-podcasts`         | 必要  | 好きな番組を一括更新       | 実装済み |


### Genres


| メソッド | パス        | 認証  | 説明                     | 状態   |
| ---- | --------- | --- | ---------------------- | ---- |
| GET  | `/genres` | 不要  | DB に登録されているジャンル一覧を取得 | 実装済み |


### Podcasts


| メソッド | パス                      | 認証  | 説明                  | 状態   |
| ---- | ----------------------- | --- | ------------------- | ---- |
| GET  | `/podcasts/search`      | 不要  | アプリ内 DB の番組をキーワード検索 | 未実装 |
| GET  | `/podcasts/popular`     | 不要  | 人気番組一覧（評価件数順）       | 未実装 |
| POST | `/podcasts/request`     | 必要  | 番組の追加リクエスト          | 実装済み |
| GET  | `/podcasts/{id}`        | 不要  | ポッドキャスト詳細取得         | 未実装 |
| GET  | `/podcasts/{id}/rating` | 不要  | ポッドキャストの平均評価        | 未実装 |


### Episodes


| メソッド | パス                            | 認証  | 説明                        | 状態   |
| ---- | ----------------------------- | --- | ------------------------- | ---- |
| GET  | `/podcasts/{id}/episodes`     | 不要  | エピソード一覧取得                 | 未実装 |
| GET  | `/episodes/{id}`              | 不要  | エピソード詳細取得                 | 未実装 |
| GET  | `/users/me/recent-episodes`   | 必要  | 記録をつけた番組の未聴取エピソード一覧 | 実装済み |


### Listening Records（聴取記録）


| メソッド   | パス                            | 認証  | 説明                | 状態   |
| ------ | ----------------------------- | --- | ----------------- | ---- |
| POST   | `/episodes/{id}/listen`       | 必要  | 聴取記録を追加           | 実装済み |
| DELETE | `/episodes/{id}/listen`       | 必要  | 聴取記録を削除           | 実装済み |
| GET    | `/episodes/{id}/listen`       | 必要  | 自分がこのエピソードを聴いたか確認 | 実装済み |
| GET    | `/users/me/listening-records` | 必要  | 自分の聴取履歴一覧         | 実装済み |


### Ratings（評価）

エピソードに対する星評価（1〜5）。1ユーザー1エピソードにつき1件（重複不可、編集で更新）。感想（Comments）とは独立した別オブジェクト。

| メソッド   | パス                            | 認証  | 説明                  | 状態   |
| ------ | ----------------------------- | --- | ------------------- | ---- |
| POST   | `/episodes/{id}/ratings`      | 必要  | 評価投稿                | 未実装 |
| GET    | `/episodes/{id}/ratings/mine` | 必要  | 自分の評価取得             | 未実装 |
| PUT    | `/episodes/{id}/ratings/mine` | 必要  | 自分の評価更新             | 未実装 |
| DELETE | `/episodes/{id}/ratings/mine` | 必要  | 自分の評価削除             | 未実装 |
| GET    | `/episodes/{id}/ratings`      | 不要  | エピソードの評価集計（平均・件数・分布） | 未実装 |
| GET    | `/users/me/ratings`           | 必要  | 自分の評価一覧             | 未実装 |


### Comments（感想）

エピソードに対するテキスト感想。1ユーザー1エピソードに対して**複数件投稿可能**（重複制限なし）。評価（Ratings）とは独立した別オブジェクト。更新・削除はコメント ID 単位で行う（1ユーザー複数件あり得るため `/episodes/{id}/comments/mine` は提供しない）。

| メソッド   | パス                       | 認証  | 説明              | 状態   |
| ------ | ------------------------ | --- | --------------- | ---- |
| POST   | `/episodes/{id}/comments` | 必要  | 感想投稿（複数可）       | 未実装 |
| GET    | `/episodes/{id}/comments` | 不要  | エピソードの感想一覧      | 未実装 |
| PUT    | `/comments/{id}`         | 必要  | 感想更新（投稿者本人のみ）  | 未実装 |
| DELETE | `/comments/{id}`         | 必要  | 感想削除（投稿者本人のみ）  | 未実装 |
| GET    | `/users/me/comments`     | 必要  | 自分の感想一覧         | 未実装 |


### Timeline（タイムライン）


| メソッド | パス          | 認証  | 説明                 | 状態 |
| ---- | ----------- | --- | ------------------ | -- |
| GET  | `/timeline` | 不要  | 最新の感想のタイムライン        | 未実装 |


### Sitemap

FE の `app/sitemap.ts` からのみ呼ばれる内部 API。`sitemap.xml` の生成に必要な ID と更新日時のみを全件返す。ページングなし。

**認証**: 共有秘密の Bearer トークン（`Authorization: Bearer <SITEMAP_API_TOKEN>`）。JWT ではなく事前共有された静的トークンで、FE（Netlify）と BE（Cloud Run）の両方に同じ環境変数 `SITEMAP_API_TOKEN` を設定する pre-shared token 方式。`sitemap.xml` 自体はクローラー向けに公開されるが、データソース API を直接公開するとユーザー列挙やスクレイピングの容易化に繋がるため保護する（GitHub / Twitter 等と同じ構成）。

| メソッド | パス                   | 認証 | 説明                    | 状態   |
| ---- | -------------------- | --- | --------------------- | ---- |
| GET  | `/sitemap/podcasts`  | 必要（共有秘密の Bearer） | 全 podcast の id / updated_at | 実装済み |
| GET  | `/sitemap/episodes`  | 必要（共有秘密の Bearer） | 全 episode の id / updated_at | 実装済み |
| GET  | `/sitemap/users`     | 必要（共有秘密の Bearer） | 有効な全ユーザーの username / updated_at | 実装済み |


### Admin（管理用）

RSS フィードがない番組（Spotify 独占等）の手動登録用。管理者権限が必要（`AdminAuth` ミドルウェアで管理者ユーザー ID リストに含まれるかチェック）。管理者でない場合は 403 Forbidden が返される。

| メソッド | パス                                | 認証        | 説明            | 状態   |
| ---- | --------------------------------- | --------- | ------------- | ---- |
| POST | `/admin/podcasts`                 | 必要（管理者）  | 番組の手動登録       | 実装済み |
| POST | `/admin/podcasts/{id}/episodes`   | 必要（管理者）  | エピソードの手動登録    | 実装済み |


### 内部管理用（フロントエンドから直接呼ばない）


| メソッド | パス                              | 認証  | 説明                | 状態   |
| ---- | ------------------------------- | --- | ----------------- | ---- |
| POST | `/podcasts/{id}/episodes/fetch` | 必要  | RSS フィードからエピソード取得 | 実装済み |
| POST | `/podcasts/{id}/episodes`       | 必要  | エピソード手動作成         | 実装済み |
| POST | `/podcasts/fetch-url`           | 必要  | URL から OGP 情報取得   | 実装済み |


---

## API 詳細設計

### Users

#### POST `/users/profile` — 初回プロフィール作成

Google 認証後の初回ログイン時に、ユーザー名と表示名を設定する。

**リクエスト**:

```json
{
  "username": "kosei",
  "display_name": "コウセイ"
}
```

- `username`: 必須。3〜30文字、英数字とアンダースコアのみ、一意
- `display_name`: 必須

**レスポンス**:

```json
// 201 Created（公開プロフィール形式で返却）
{
  "id": "uuid",
  "username": "kosei",
  "display_name": "コウセイ",
  "avatar_url": null,
  "bio": null,
  "created_at": "2026-03-10T00:00:00Z"
}

// 409 Conflict（ユーザー名が既に使用されている）
{ "error": "username already taken" }

// 400 Bad Request（バリデーションエラー）
{ "error": "username must be 3-30 characters, alphanumeric and underscores only" }
```

#### GET `/users/me` — 自分のプロフィール取得

通常のプロフィール情報に加えて、管理者かどうかを示す `is_admin` フィールドを含む。

**レスポンス**:

```json
// 200 OK
{
  "id": "uuid",
  "username": "kosei",
  "display_name": "コウセイ",
  "avatar_url": "https://...",
  "bio": "ラジオ好き",
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-10T00:00:00Z",
  "is_admin": false
}

// 404 Not Found（プロフィール未作成）
{ "error": "profile not found" }
```

#### PUT `/users/me` — プロフィール更新

表示名と自己紹介を更新する。ユーザー名は変更不可。

**リクエスト**:

```json
{
  "display_name": "コウセイ（更新）",
  "bio": "ラジオとポッドキャストが好き"
}
```

- `display_name`: 必須
- `bio`: 任意

**レスポンス**:

```json
// 200 OK（公開プロフィール形式で返却）
{
  "id": "uuid",
  "username": "kosei",
  "display_name": "コウセイ（更新）",
  "avatar_url": "https://...",
  "bio": "ラジオとポッドキャストが好き",
  "created_at": "2026-03-10T00:00:00Z"
}
```

#### POST `/users/me/avatar` — アバター画像アップロード

`multipart/form-data` でアバター画像をアップロードする。

**リクエスト**: `multipart/form-data`

- `avatar`: 画像ファイル（JPEG / PNG、上限 2MB）

**レスポンス**:

```json
// 200 OK
{
  "avatar_url": "https://..."
}

// 400 Bad Request
{ "error": "file must be JPEG or PNG, max 2MB" }
```

#### GET `/users/{username}` — 公開プロフィール取得

**レスポンス**:

```json
// 200 OK
{
  "id": "uuid",
  "username": "kosei",
  "display_name": "コウセイ",
  "avatar_url": "https://...",
  "bio": "ラジオ好き",
  "created_at": "2026-03-10T00:00:00Z"
}

// 404 Not Found
{ "error": "user not found" }
```

#### GET `/users/{username}/listening-records` — ユーザーの聴取履歴一覧（公開）

ユーザーページに表示する聴取履歴。認証不要。

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "records": [
    {
      "id": "uuid",
      "episode": {
        "id": "uuid",
        "title": "エピソードタイトル",
        "podcast_id": "uuid",
        "artwork_url": "https://...",
        "published_at": "2026-03-01T00:00:00Z"
      },
      "podcast": {
        "id": "uuid",
        "title": "ポッドキャスト名",
        "artwork_url": "https://..."
      },
      "created_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 42
}
```

#### GET `/users/{username}/ratings/stats` — ユーザーの評価統計サマリー（公開）

ユーザーページに表示する評価のサマリー。**個別の評価レコードは返さず統計値のみ**を返す。認証不要。

設計判断: 旧モデル（reviews）ではユーザーページにレビュー一覧（rating + comment）を表示していたが、新モデルでは「評価は星のみ・短い」「感想は本文中心・長い」と性質が大きく異なる。評価の個別一覧はノイズになりやすいため、ユーザーページではサマリーに集約し、感想は別エンドポイント（`/users/{username}/comments`）で一覧表示する。

**レスポンス**:

```json
// 200 OK
{
  "total_ratings": 42,
  "average_rating": 4.1,
  "distribution": {
    "1": 1,
    "2": 2,
    "3": 8,
    "4": 18,
    "5": 13
  }
}

// 404 Not Found
{ "error": "user not found" }
```

- `total_ratings`: ユーザーが投稿した評価の総件数
- `average_rating`: ユーザーの平均評価（小数第1位まで）
- `distribution`: 評価値ごとの件数（1〜5 の星別ヒストグラム）

#### GET `/users/{username}/comments` — ユーザーの感想一覧（公開）

ユーザーページに表示する感想一覧。認証不要。1ユーザー1エピソードに複数件あり得るため、`episode` / `podcast` の組合せが重複することがある。

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "comments": [
    {
      "id": "uuid",
      "episode": {
        "id": "uuid",
        "title": "エピソードタイトル",
        "podcast_id": "uuid",
        "artwork_url": "https://..."
      },
      "podcast": {
        "id": "uuid",
        "title": "ポッドキャスト名",
        "artwork_url": "https://..."
      },
      "body": "神回だった！後半のフリートークが最高",
      "created_at": "2026-03-10T00:00:00Z",
      "updated_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 24
}
```

---

### Favorite Podcasts（好きな番組）

#### GET `/users/{username}/favorite-podcasts` — 好きな番組一覧（公開）

ユーザーページの「好きな番組」セクション用。認証不要。

**レスポンス**:

```json
// 200 OK
{
  "podcasts": [
    {
      "id": "uuid",
      "title": "ポッドキャスト名",
      "artwork_url": "https://..."
    }
  ]
}
```

#### PUT `/users/me/favorite-podcasts` — 好きな番組を一括更新

プロフィール編集画面で好きな番組リストを保存する。既存のリストを全て置き換える。

**リクエスト**:

```json
{
  "podcast_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**レスポンス**:

```json
// 200 OK
{
  "podcasts": [
    {
      "id": "uuid",
      "title": "ポッドキャスト名",
      "artwork_url": "https://..."
    }
  ]
}
```

---

### Genres

#### GET `/genres` — ジャンル一覧

DB に登録されている番組のジャンル一覧を返す。認証不要。英語名・日本語名の両方を含む。

サブカテゴリ（例: 「即興コメディ」「スタンドアップコメディ」）は Apple Podcasts のカテゴリツリーに基づいて親カテゴリ（例: 「コメディ」）に集約される。これにより 72 種類あったジャンルが 19 種類程度に絞られ、ユーザーが選びやすくなる。

**レスポンス**:

```json
// 200 OK
{
  "genres": [
    {
      "id": "Comedy",
      "name_en": "Comedy",
      "name_ja": "コメディ"
    },
    {
      "id": "News",
      "name_en": "News",
      "name_ja": "ニュース"
    }
  ]
}
```

---

### Podcasts

#### GET `/podcasts/search` — 番組検索

アプリ内 DB に登録済みの番組をキーワードで検索する。認証不要。

**クエリパラメータ**:

- `q`: 検索キーワード（`genre` 指定時は省略可、それ以外では必須）
- `genre`: 親カテゴリ名（英語）で絞り込み（任意）。ジャンル一覧 API で返される `id` を指定する。バックエンドが自動的にサブカテゴリに展開して検索する（例: `genre=Comedy` で "Comedy", "Comedy Fiction", "Improv" 等の全サブカテゴリにマッチ）
- `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "podcasts": [
    {
      "id": "uuid",
      "title": "ポッドキャスト名",
      "author": "配信者名",
      "artwork_url": "https://...",
      "average_rating": 4.2,
      "total_ratings": 12,
      "favorite_count": 5
    }
  ],
  "total": 5
}
```

##### iTunes API フォールバック（副作用あり）

DB の検索結果が少ない場合、iTunes Search API で補完検索を行い、結果に含める。**この過程で新規番組を `podcasts` テーブルに書き込む副作用がある**。

**発動条件（以下のすべてを満たす場合）**:

- `q` が空でない（キーワード検索あり）
- DB のキーワード検索結果の総件数が 3 件以下
- `offset == 0`（最初のページ）
- iTunes クライアントが有効（サーバー構成で DI されており `nil` でないこと）

**発動時の挙動**:

1. iTunes Search API にキーワード検索をかける（最大 10 件）
2. 取得した番組ごとに `itunes_id` で DB を照会（`GetByItunesID`）
   - 既存番組 → DB には書き込まず、検索結果に追加するだけ
   - 新規番組 → `podcasts` テーブルに `source_type = "itunes"` で保存し、検索結果に追加
3. 最終的な `total` は、返却する `podcasts` 配列の件数（DB 結果と iTunes 補完結果を重複除外した合計）で再計算される
4. iTunes API がエラーを返した場合はログに記録し、DB 検索結果のみを返す（ユーザーには影響させない）

**呼び出し元の観点で注意すべきこと**:

- **認証不要ルートだが DB 書き込みが発生する**: 未ログインユーザーのリクエストでも `podcasts` 行が新規作成されうる
- 初回応答が遅くなる場合がある（iTunes API 呼び出し + DB 書き込みが同期的に走るため）
- 新規保存された番組のレスポンスは `average_rating = 0`, `total_ratings = 0`, `favorite_count = 0` となる
- 上記 2 の「既存番組を検索結果に追加するだけ」のケースでは、`PodcastRepository.GetByIDsWithStats` を 1 クエリで呼び出して DB の集計値（`average_rating` / `total_ratings` / `favorite_count`）を取得し、レスポンスに反映する（podlog#351 で修正済み）。集計ロジックは DB キーワード検索ヒット経路と完全に一致するため、同じ番組が両経路のどちらで返っても集計値は同一になる

##### 注意事項（設計判断）

- RESTful 原則では GET リクエストに副作用を持たせない（読み取り専用）べきだが、本エンドポイントでは **初回検索時の DB キャッシュ生成**としてこの副作用を許容している。iTunes API を毎回呼ぶとレートリミット・レイテンシの問題があるため、「検索でヒットした番組を DB に取り込み、次回以降は DB だけで返す」戦略を採っている
- **冪等性は `itunes_id` の部分ユニークインデックスで担保されている**。同じキーワードで連続して検索しても、同一 `itunes_id` の番組は重複して保存されない（usecase 側の `GetByItunesID` による事前チェック + DB 側の `idx_podcasts_itunes_id` による部分ユニーク制約。詳細は `database.md` 参照）
- この副作用は将来の開発者が把握しにくいため、実装時は `backend/internal/usecase/podcast.go` の `Search` メソッドと本セクションを合わせて参照すること

#### GET `/podcasts/popular` — 人気番組一覧

評価件数（`total_ratings`）の多い番組をランキング順で取得する。探す画面の「人気の番組」セクションで使用。認証不要。

設計判断: 旧モデルでは「レビュー件数」で並び替えていたが、評価/感想分離後は **評価件数（`total_ratings`） ベース**で並び替える。評価は1ユーザー1エピソード=1件で総量が安定し、人気指標として既存挙動の互換が取りやすいため（感想件数ベースへの切替は別 Issue で検討）。

**クエリパラメータ**:

- `limit`: 最大取得件数（デフォルト 10、上限 50）

**レスポンス**:

```json
// 200 OK
{
  "podcasts": [
    {
      "id": "uuid",
      "title": "ポッドキャスト名",
      "author": "配信者名",
      "artwork_url": "https://...",
      "average_rating": 4.5,
      "total_ratings": 48
    }
  ],
  "total": 10
}
```

#### POST `/podcasts/request` — 番組の追加リクエスト

検索で見つからない番組の追加をリクエストする。ログイン必須。

**リクエスト**:

```json
{
  "title": "番組名",
  "url": "https://podcasts.apple.com/..."
}
```

- `title`: 必須
- `url`: 任意（Apple Podcasts や Spotify の URL）

**レスポンス**:

```json
// 201 Created
{
  "id": "uuid",
  "title": "番組名",
  "url": "https://podcasts.apple.com/...",
  "status": "pending",
  "created_at": "2026-03-10T00:00:00Z"
}
```

#### GET `/podcasts/{id}` — ポッドキャスト詳細取得

番組詳細ページ用。番組情報に加えて平均評価・評価件数・感想件数を含む。

**レスポンス**:

```json
// 200 OK
{
  "id": "uuid",
  "title": "ポッドキャスト名",
  "author": "配信者名",
  "description": "番組の説明文...",
  "artwork_url": "https://...",
  "genre": "コメディ",
  "feed_url": "https://...",
  "average_rating": 4.2,
  "total_ratings": 48,
  "total_comments": 73,
  "created_at": "2026-03-10T00:00:00Z"
}

// 404 Not Found
{ "error": "podcast not found" }
```

- `total_ratings`: 番組に紐づく全エピソードの評価件数の合計
- `total_comments`: 番組に紐づく全エピソードの感想件数の合計

#### GET `/podcasts/{id}/rating` — ポッドキャストの平均評価

ポッドキャストに紐づく全エピソードの評価から集計する。

**レスポンス**:

```json
// 200 OK
{
  "average_rating": 4.2,
  "total_ratings": 128
}
```

---

### Episodes

#### GET `/podcasts/{id}/episodes` — エピソード一覧取得

番組詳細ページのエピソード一覧用。公開日の新しい順。各エピソードに平均評価・評価件数・感想件数を含む。
認証済みリクエストの場合、各エピソードに聴取状態（`listened`）を含む。未認証の場合は `listened` フィールドを省略する。

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK（認証済み）
{
  "episodes": [
    {
      "id": "uuid",
      "title": "エピソードタイトル",
      "description": "エピソードの説明...",
      "duration_ms": 3600000,
      "published_at": "2026-03-01T00:00:00Z",
      "average_rating": 4.5,
      "total_ratings": 3,
      "total_comments": 7,
      "listened": true
    }
  ],
  "total": 100
}

// 200 OK（未認証）
{
  "episodes": [
    {
      "id": "uuid",
      "title": "エピソードタイトル",
      "description": "エピソードの説明...",
      "duration_ms": 3600000,
      "published_at": "2026-03-01T00:00:00Z",
      "average_rating": 4.5,
      "total_ratings": 3,
      "total_comments": 7
    }
  ],
  "total": 100
}
```

**`listened` フィールドの注意事項**:
- 未認証リクエストの場合: `listened` フィールドは省略される
- 認証済みでも聴取状態の取得に失敗した場合: `listened` フィールドは省略される（Graceful Degradation）
- クライアントは `listened` が存在しない場合、未聴取として扱うことを推奨する

#### GET `/episodes/{id}` — エピソード詳細取得

エピソード詳細ページ用。番組情報、平均評価、評価件数、感想件数を含む。
認証済みリクエストの場合、聴取状態（`listened`）を含む。未認証の場合は `listened` フィールドを省略する。

**レスポンス**:

```json
// 200 OK（認証済み）
{
  "id": "uuid",
  "title": "エピソードタイトル",
  "description": "エピソードの説明...",
  "audio_url": "https://...",
  "artwork_url": "https://...",
  "duration_ms": 3600000,
  "published_at": "2026-03-01T00:00:00Z",
  "podcast": {
    "id": "uuid",
    "title": "ポッドキャスト名",
    "artwork_url": "https://..."
  },
  "average_rating": 4.2,
  "total_ratings": 5,
  "total_comments": 12,
  "listened": false,
  "created_at": "2026-03-10T00:00:00Z"
}

// 404 Not Found
{ "error": "episode not found" }
```

**`listened` フィールドの注意事項**:
- 未認証リクエストの場合: `listened` フィールドは省略される
- 認証済みでも聴取状態の取得に失敗した場合: `listened` フィールドは省略される（Graceful Degradation）
- クライアントは `listened` が存在しない場合、未聴取として扱うことを推奨する

#### GET `/users/me/recent-episodes` — 記録をつけた番組の未聴取エピソード一覧（番組グループ化）

認証ユーザーが聴取記録をつけた番組のうち、まだ聴いていないエピソードを番組ごとにグループ化して返す。各番組の未聴取エピソードは最新3件まで。番組は最新エピソードの公開日が新しい順で並ぶ。記録ページの「最近のエピソード」セクションで使用。

**クエリパラメータ**: なし

**レスポンス**:

```json
// 200 OK
{
  "podcasts": [
    {
      "podcast": {
        "id": "uuid",
        "title": "ポッドキャスト名",
        "artwork_url": "https://..."
      },
      "episodes": [
        {
          "id": "uuid",
          "title": "エピソードタイトル",
          "description": "説明...",
          "duration_ms": 3600000,
          "published_at": "2026-03-22T00:00:00Z"
        }
      ],
      "total_unlistened": 5
    }
  ],
  "recorded_podcast_count": 3
}
```

- `podcasts`: 番組ごとにグループ化された未聴取エピソード。各番組の `episodes` は最新3件まで
- `total_unlistened`: その番組の未聴取エピソード総数。フロントエンドの「もっと見る」表示の判定に使用
- `recorded_podcast_count`: ユーザーが記録をつけた番組数。初回利用（0）と「記録はあるが新着なし」を区別するために使用

---

### Listening Records（聴取記録）

#### POST `/episodes/{id}/listen` — 聴取記録を追加

認証ユーザーが指定エピソードを「聴いた」として記録する。既に記録済みの場合は 409 を返す。

**リクエスト**: ボディなし

**レスポンス**:

```json
// 201 Created
{
  "id": "uuid",
  "user_id": "uuid",
  "episode_id": "uuid",
  "created_at": "2026-03-10T00:00:00Z"
}

// 409 Conflict
{ "error": "already listened" }
```

#### DELETE `/episodes/{id}/listen` — 聴取記録を削除

**リクエスト**: ボディなし

**レスポンス**:

```json
// 204 No Content
```

#### GET `/episodes/{id}/listen` — 聴取状態確認

**レスポンス**:

```json
// 200 OK
{
  "listened": true,
  "listened_at": "2026-03-10T00:00:00Z"
}
```

#### GET `/users/me/listening-records` — 自分の聴取履歴一覧

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "records": [
    {
      "id": "uuid",
      "episode": {
        "id": "uuid",
        "title": "エピソードタイトル",
        "podcast_id": "uuid",
        "artwork_url": "https://...",
        "published_at": "2026-03-01T00:00:00Z"
      },
      "podcast": {
        "id": "uuid",
        "title": "ポッドキャスト名",
        "artwork_url": "https://..."
      },
      "created_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 42
}
```

---

### Ratings（評価）

エピソードに対する星評価（1〜5）。1ユーザー1エピソードにつき1件（重複不可、編集で更新）。感想（Comments）とは独立した別オブジェクトで、評価のみ・感想のみ・両方のいずれの組み合わせも可能。

> **FE の使い分けルール（重要）**: エピソード詳細で星をクリックしたときの「即時に作成または更新」（`screens.md` の評価セクション参照）は、FE が以下の手順で **`POST` と `PUT` を内部的に使い分ける**ことで実現する。BE は POST を冪等にしない（upsert にしない）ため、FE 側のフロー設計が必須:
>
> 1. ページ初期描画時に `GET /episodes/{id}/ratings/mine` を呼び、自分の評価有無を確認する
> 2. ユーザーが星をクリックしたら、自分の評価が **無ければ `POST /episodes/{id}/ratings`、あれば `PUT /episodes/{id}/ratings/mine`** を呼ぶ
> 3. 並行操作で `POST` が 409 を返した場合は、フォールバックで `PUT` に切り替える（同一 user × episode が同時にタブ複数で操作された等のレース対策）
>
> この設計判断の根拠: BE 側を upsert にすると CHECK 制約違反時のレスポンスコードが曖昧になりやすいため、明示的に 201（作成）/ 200（更新）を分けている。

#### POST `/episodes/{id}/ratings` — 評価投稿

1ユーザーにつき1エピソード1評価。既に投稿済みの場合は 409 を返す（**更新は `PUT /episodes/{id}/ratings/mine` を使う**。FE のフロー詳細はセクション冒頭の「FE の使い分けルール」を参照）。

**リクエスト**:

```json
{
  "rating": 4
}
```

- `rating`: 1〜5 の整数（必須）

**レスポンス**:

```json
// 201 Created
{
  "id": "uuid",
  "user_id": "uuid",
  "episode_id": "uuid",
  "rating": 4,
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-10T00:00:00Z"
}

// 409 Conflict
{ "error": "rating already exists" }
```

#### GET `/episodes/{id}/ratings/mine` — 自分の評価取得

エピソード詳細画面で、自分が既に評価を付けているか確認し、付けていれば現在の値を表示するために使用する。

レスポンスは `POST` / `PUT /episodes/{id}/ratings(/mine)` と同じ Rating オブジェクト形式（`id` / `user_id` / `episode_id` / `rating` / `created_at` / `updated_at` の 6 フィールド）に統一する。FE 側で型定義を共有しやすくするため。

**レスポンス**:

```json
// 200 OK
{
  "id": "uuid",
  "user_id": "uuid",
  "episode_id": "uuid",
  "rating": 4,
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-10T00:00:00Z"
}

// 404 Not Found（評価未投稿）
{ "error": "rating not found" }
```

#### PUT `/episodes/{id}/ratings/mine` — 評価更新

**リクエスト**:

```json
{
  "rating": 5
}
```

**レスポンス**:

```json
// 200 OK
{
  "id": "uuid",
  "user_id": "uuid",
  "episode_id": "uuid",
  "rating": 5,
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-10T12:00:00Z"
}
```

#### DELETE `/episodes/{id}/ratings/mine` — 評価削除

**評価のみ**を削除する。同一ユーザーが投稿した感想（comments）には影響しない。

**レスポンス**:

```json
// 204 No Content
```

#### GET `/episodes/{id}/ratings` — エピソードの評価集計

エピソード詳細ページで、平均評価と分布を表示するために使用する。個別の評価レコードは返さず**集計値のみ**を返す（評価は星のみで誰が付けたかをユーザーページに一覧表示する設計ではないため）。

**レスポンス**:

```json
// 200 OK
{
  "average_rating": 4.2,
  "total_ratings": 15,
  "distribution": {
    "1": 0,
    "2": 1,
    "3": 2,
    "4": 6,
    "5": 6
  }
}
```

- `average_rating`: 平均評価（小数第1位まで）
- `total_ratings`: 評価の総件数
- `distribution`: 星別ヒストグラム（1〜5 の各星に該当する件数）

#### GET `/users/me/ratings` — 自分の評価一覧

自分が付けた評価をエピソード・番組情報付きで一覧取得する。設定ページや管理画面での確認・整理用途を想定（ユーザーページの公開一覧ではない。公開ページでは `/users/{username}/ratings/stats` の集計のみ）。

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "ratings": [
    {
      "id": "uuid",
      "episode": {
        "id": "uuid",
        "title": "エピソードタイトル",
        "podcast_id": "uuid",
        "artwork_url": "https://..."
      },
      "podcast": {
        "id": "uuid",
        "title": "ポッドキャスト名",
        "artwork_url": "https://..."
      },
      "rating": 4,
      "created_at": "2026-03-10T00:00:00Z",
      "updated_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 10
}
```

---

### Comments（感想）

エピソードに対するテキスト感想。1ユーザー1エピソードに対して**複数件投稿可能**（重複制限なし）。評価（Ratings）とは独立した別オブジェクトで、評価のみ・感想のみ・両方のいずれの組み合わせも可能。

更新・削除は **コメント ID 単位** で行う（1ユーザー複数件あり得るため `/episodes/{id}/comments/mine` のような「自分の感想」エンドポイントは提供しない）。

#### POST `/episodes/{id}/comments` — 感想投稿

エピソードに感想を新規投稿する。同一エピソードに既に自分の感想があっても拒否しない（複数件投稿可）。

**リクエスト**:

```json
{
  "body": "神回だった！後半のフリートークが最高"
}
```

- `body`: テキスト（必須、1〜1000 文字）

**レスポンス**:

```json
// 201 Created
{
  "id": "uuid",
  "user_id": "uuid",
  "episode_id": "uuid",
  "body": "神回だった！後半のフリートークが最高",
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-10T00:00:00Z"
}

// 400 Bad Request（空文字 / 1000文字超）
{ "error": "body must be 1-1000 characters" }
```

#### GET `/episodes/{id}/comments` — エピソードの感想一覧

エピソード詳細ページに表示する感想一覧。投稿日時の新しい順で返す。認証不要。

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "comments": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "username": "kosei",
        "display_name": "コウセイ",
        "avatar_url": "https://..."
      },
      "body": "神回だった！",
      "created_at": "2026-03-10T00:00:00Z",
      "updated_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 15
}
```

#### PUT `/comments/{id}` — 感想更新

コメント ID 単位で本文を更新する。投稿者本人のみ操作可能（他ユーザーが操作した場合は 403）。

**リクエスト**:

```json
{
  "body": "2回目聴いたら更に良かった"
}
```

**レスポンス**:

```json
// 200 OK
{
  "id": "uuid",
  "user_id": "uuid",
  "episode_id": "uuid",
  "body": "2回目聴いたら更に良かった",
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-10T12:00:00Z"
}

// 403 Forbidden（他ユーザーの感想）
{ "error": "forbidden" }

// 404 Not Found
{ "error": "comment not found" }
```

#### DELETE `/comments/{id}` — 感想削除

コメント ID 単位で削除する。投稿者本人のみ操作可能。**当該コメント 1 件のみを削除**し、同一エピソードへの他の感想や評価には影響しない。

**レスポンス**:

```json
// 204 No Content

// 403 Forbidden（他ユーザーの感想）
{ "error": "forbidden" }

// 404 Not Found
{ "error": "comment not found" }
```

#### GET `/users/me/comments` — 自分の感想一覧

自分が投稿した感想をエピソード・番組情報付きで一覧取得する。1ユーザー1エピソードに複数件あり得るため、`episode` / `podcast` の組合せが重複することがある。

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "comments": [
    {
      "id": "uuid",
      "episode": {
        "id": "uuid",
        "title": "エピソードタイトル",
        "podcast_id": "uuid",
        "artwork_url": "https://..."
      },
      "podcast": {
        "id": "uuid",
        "title": "ポッドキャスト名",
        "artwork_url": "https://..."
      },
      "body": "神回だった！",
      "created_at": "2026-03-10T00:00:00Z",
      "updated_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 24
}
```

---

### Timeline（タイムライン）

#### GET `/timeline` — タイムライン

全ユーザーの最新の**感想**を時系列で表示する（評価/感想分離後のコアコンセプト「ラジオの感想が回ごとに集まる場所」を体現するタイムライン）。

> **注**: 旧モデルでは `reviews`（rating + comment 同居）を返していたが、新モデルでは `comments`（感想本文中心）を返す。タイムラインの **UI 再設計（カードレイアウト・ヒーロー・並びの優先順位）は podlog-workspace#60 に委譲**。本エンドポイントはあくまでデータソース切替のみ扱う。

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

タイムラインの comment 要素は、他の comment 一覧 API（`GET /episodes/{id}/comments`, `GET /users/me/comments`, `GET /users/{username}/comments`）と同じく `updated_at` を含める（FE 側の型共有 + 「編集済み」表示の余地を残すため）。並び替えは `created_at DESC` のまま変更しない。

```json
// 200 OK
{
  "comments": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "username": "kosei",
        "display_name": "コウセイ",
        "avatar_url": "https://..."
      },
      "episode": {
        "id": "uuid",
        "title": "エピソードタイトル",
        "podcast_id": "uuid",
        "artwork_url": "https://..."
      },
      "podcast": {
        "id": "uuid",
        "title": "ポッドキャスト名",
        "artwork_url": "https://..."
      },
      "body": "神回だった！",
      "created_at": "2026-03-10T00:00:00Z",
      "updated_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 200
}
```

---

### Sitemap

FE の `app/sitemap.ts` からのみ呼ばれる内部 API 群。各エンドポイントは sitemap 生成に必要な最小限のフィールド（ID と更新日時）のみを全件返す。ページングなし。

**認証（必須）**: 共有秘密の Bearer トークン認証で保護される。FE と BE の両方に同じ環境変数 `SITEMAP_API_TOKEN` を設定し、FE は `Authorization: Bearer <token>` ヘッダーを付けて呼び出す。BE は `crypto/subtle.ConstantTimeCompare` で定数時間比較し、一致しなければ 401 を返す。`development` 環境では FE 側もヘッダーを付けないため、middleware が認証を素通しする（運用環境差異）。

**fail-secure 動作**: 万一 BE 側の `SITEMAP_API_TOKEN` が空文字列で起動した場合、middleware は全リクエストを 401 にする。誤って空のトークンで素通りさせないため。Config の `Validate()` でも本番環境では空のトークンを起動エラーで弾く（多重防御）。

`updated_at` は RFC3339 形式（例: `"2026-04-01T00:00:00Z"`）の UTC 文字列。`ORDER BY updated_at DESC` の順で返す。

将来 episode が 10 万件オーダーに増えた場合は sitemap index 化（分割）を検討する必要があるが、現状（podcasts ~700 件 / episodes ~2000 件 / users 数十件）では全件 1 リクエストで返しても数百 KB 以下で問題ない。

#### GET `/sitemap/podcasts` — sitemap 用 podcast 一覧

**リクエスト**: `Authorization: Bearer <SITEMAP_API_TOKEN>`

**レスポンス**:

```json
// 200 OK
{
  "items": [
    { "id": "uuid", "updated_at": "2026-04-01T00:00:00Z" }
  ]
}

// 401 Unauthorized（トークン不一致 / ヘッダー欠落 / 形式不正）
{ "error": "unauthorized" }
```

#### GET `/sitemap/episodes` — sitemap 用 episode 一覧

**リクエスト**: `Authorization: Bearer <SITEMAP_API_TOKEN>`

**レスポンス**:

```json
// 200 OK
{
  "items": [
    { "id": "uuid", "updated_at": "2026-04-01T00:00:00Z" }
  ]
}

// 401 Unauthorized
{ "error": "unauthorized" }
```

#### GET `/sitemap/users` — sitemap 用 user 一覧

ソフトデリート済み（`users.deleted_at IS NOT NULL`）のユーザーは除外する。プロフィール未作成のユーザーは `users` テーブルに行が存在しないため自然に除外される。

`id` ではなく `username` を返すのは、公開プロフィール URL が `/users/{username}` で組み立てられるため（FE の sitemap.ts では username をそのまま URL に組み込める）。

**リクエスト**: `Authorization: Bearer <SITEMAP_API_TOKEN>`

**レスポンス**:

```json
// 200 OK
{
  "items": [
    { "username": "kosei", "updated_at": "2026-04-01T00:00:00Z" }
  ]
}

// 401 Unauthorized
{ "error": "unauthorized" }
```

---

### Admin（管理用）

#### POST `/admin/podcasts` — 番組の手動登録

RSS フィードがない番組（Spotify 独占等）を手動で登録する。`feed_url` なしで登録可能。管理者権限が必要（`AdminAuth` ミドルウェアで認証 + 管理者チェック）。管理者でない場合は 403 Forbidden。

**リクエスト**:

```json
{
  "title": "オールナイトニッポン",
  "author": "ニッポン放送",
  "artwork_url": "https://example.com/artwork.jpg",
  "description": "番組の説明文",
  "genre": "コメディ"
}
```

- `title`: 必須
- `author`: 任意
- `artwork_url`: 任意
- `description`: 任意
- `genre`: 任意

**レスポンス**:

```json
// 201 Created
{
  "id": "uuid",
  "title": "オールナイトニッポン",
  "author": "ニッポン放送",
  "artwork_url": "https://example.com/artwork.jpg",
  "description": "番組の説明文",
  "genre": "コメディ",
  "source_type": "manual",
  "created_at": "2026-03-19T00:00:00Z",
  "updated_at": "2026-03-19T00:00:00Z"
}

// 400 Bad Request（タイトル未指定）
{ "error": "title is required" }

// 403 Forbidden（管理者でない）
{ "error": "admin access required" }
```

#### POST `/admin/podcasts/{id}/episodes` — エピソードの手動登録

指定した番組にエピソードを手動で追加する。管理者権限が必要。

**リクエスト**:

```json
{
  "title": "第100回",
  "description": "記念すべき100回目の放送",
  "published_at": "2026-03-01T00:00:00Z",
  "duration_ms": 3600000
}
```

- `title`: 必須
- `description`: 任意
- `published_at`: 任意（RFC3339 形式）
- `duration_ms`: 任意

**レスポンス**:

```json
// 201 Created
{
  "id": "uuid",
  "podcast_id": "uuid",
  "title": "第100回",
  "description": "記念すべき100回目の放送",
  "duration_ms": 3600000,
  "published_at": "2026-03-01T00:00:00Z",
  "created_at": "2026-03-19T00:00:00Z",
  "updated_at": "2026-03-19T00:00:00Z"
}

// 400 Bad Request（タイトル未指定）
{ "error": "title is required" }

// 403 Forbidden（管理者でない）
{ "error": "admin access required" }

// 404 Not Found（番組が存在しない）
{ "error": "podcast not found" }
```

---

## 変更履歴


| 日付         | 変更内容                                                 |
| ---------- | ---------------------------------------------------- |
| 2026-04-30 | コアコンセプト転換に伴う評価/感想分離（podlog#388 / 親 Issue: podlog-workspace#59）。`Reviews` セクション（`/episodes/{id}/reviews/*`, `/users/{username}/reviews`, `/users/me/reviews`）を全廃し、`Ratings`（星評価のみ、1ユーザー1エピソード=1件）と `Comments`（感想本文、1ユーザー1エピソードに複数件可）の2系統に分離。エピソード詳細・番組詳細・検索・人気番組のレスポンスフィールド `total_reviews` を `total_ratings` にリネームし、エピソード詳細・番組詳細には `total_comments` を新規追加。`GET /podcasts/popular` は引き続き「評価件数（`total_ratings`）の多い順」で並び替え（人気指標の互換維持）。`GET /timeline` は `reviews` フィールドを `comments` に置き換え、要素は感想本文中心（rating は持たない）。ユーザーページは公開一覧を「評価統計サマリー（`/users/{username}/ratings/stats`）+ 感想一覧（`/users/{username}/comments`）」に再設計。タイムラインの UI 再設計は podlog-workspace#60 に委譲。BE 実装は podlog#390（rating）/ podlog#391（comment + timeline）で対応。**契約変更を伴う既存エンドポイント（`/podcasts/search`, `/podcasts/popular`, `/podcasts/{id}`, `/podcasts/{id}/rating`, `/podcasts/{id}/episodes`, `/episodes/{id}`, `/timeline`）の状態カラムを「未実装」に統一**（フィールド名のリネームと新規フィールド追加でレスポンス契約が変わるため、後続の BE 実装が完了するまでは仕様書通りに動かない） |
| 2026-04-30 | sitemap API 3 種（`GET /sitemap/podcasts`, `GET /sitemap/episodes`, `GET /sitemap/users`）に共有秘密の Bearer トークン認証を追加（podlog#385）。FE / BE の両方に環境変数 `SITEMAP_API_TOKEN` を設定し、`Authorization: Bearer <token>` で突合する。`development` 環境では認証スキップ。ユーザー列挙やデータスクレイピングのリスクを軽減するため認証不要から認証必須に変更 |
| 2026-04-29 | sitemap 用の軽量 API 3 種（`GET /sitemap/podcasts`, `GET /sitemap/episodes`, `GET /sitemap/users`）を追加（podlog#377）。FE の `app/sitemap.ts` から `sitemap.xml` を生成するために使用。ページングなし、id / updated_at のみを返す軽量レスポンス（認証要件は podlog#385 / 2026-04-30 で追加） |
| 2026-04-20 | `GET /podcasts/search` の iTunes フォールバック経路で、DB 既存だがキーワード検索にヒットしなかった番組の集計値（`average_rating` / `total_reviews`（現: `total_ratings`） / `favorite_count`）を `PodcastRepository.GetByIDsWithStats` で取得して返すように修正（podlog#351）。API I/F 変更なし |
| 2026-04-08 | `GET /podcasts/{id}/episodes` と `GET /episodes/{id}` のレスポンスに認証ユーザーの聴取状態（`listened`）フィールドを追加。オプショナル認証（トークンがあれば検証、なければスキップ）を導入 |
| 2026-03-27 | `GET /users/me/recent-episodes` を番組グループ化形式に変更。レスポンスを `podcasts` 配列に変更し、各番組の未聴取エピソードを最新3件まで返すように。`limit`/`offset` パラメータを廃止 |
| 2026-03-24 | `GET /users/me/recent-episodes` を追加。記録をつけた番組の未聴取エピソード一覧 API |
| 2026-03-21 | 実装との差分を洗い出し修正。`GET /podcasts/popular` を追加、Admin API の認証要件を管理者権限に修正、`GET /users/me` に `is_admin` フィールド追加、`POST /users/profile` と `PUT /users/me` のレスポンスを公開プロフィール形式に修正、聴取履歴エピソード情報に `artwork_url` 追加、エピソードレビュー一覧から `updated_at` 削除、タイムラインのエピソード情報を修正、ページネーションの上限を明記 |
| 2026-03-19 | 管理用 API（`POST /admin/podcasts`, `POST /admin/podcasts/{id}/episodes`）を追加。RSS フィードがない番組の手動登録に対応 |
| 2026-03-18 | ジャンル一覧 API (`GET /genres`) を追加。検索 API に `genre` クエリパラメータを追加。サブカテゴリを親カテゴリに集約し、genre パラメータをサブカテゴリ展開に対応 |
| 2026-03-11 | 機能要件書・画面仕様書に基づいて全面改訂。不足 API の追加、レスポンス詳細設計の補完、認証要否の修正 |


---

## 更新ルール

API を追加・変更する際は、以下を必ず行うこと:

1. この設計書（api-design.md）のエンドポイント一覧と詳細設計を更新する
2. Swagger コメントを更新し `swag generate` を実行する
3. 状態カラムを「実装済み」に変更する

