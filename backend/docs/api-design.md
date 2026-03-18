# API 設計書

## 共通仕様

- **ベースパス**: `/api/v1`
- **形式**: JSON
- **認証**: Supabase JWT を `Authorization: Bearer <token>` ヘッダーで送信
- **エラーレスポンス**: `{ "error": "メッセージ" }`
- **ページネーション**: `limit`（デフォルト 20）+ `offset`（デフォルト 0）をクエリパラメータで指定

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
| GET  | `/users/{username}/reviews`           | 不要  | ユーザーのレビュー一覧（公開）    | 実装済み |


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
| GET  | `/podcasts/search`      | 不要  | アプリ内 DB の番組をキーワード検索 | 実装済み |
| POST | `/podcasts/request`     | 必要  | 番組の追加リクエスト          | 実装済み |
| GET  | `/podcasts/{id}`        | 不要  | ポッドキャスト詳細取得         | 実装済み |
| GET  | `/podcasts/{id}/rating` | 不要  | ポッドキャストの平均評価        | 実装済み |


### Episodes


| メソッド | パス                        | 認証  | 説明        | 状態   |
| ---- | ------------------------- | --- | --------- | ---- |
| GET  | `/podcasts/{id}/episodes` | 不要  | エピソード一覧取得 | 実装済み |
| GET  | `/episodes/{id}`          | 不要  | エピソード詳細取得 | 実装済み |


### Listening Records（聴取記録）


| メソッド   | パス                            | 認証  | 説明                | 状態   |
| ------ | ----------------------------- | --- | ----------------- | ---- |
| POST   | `/episodes/{id}/listen`       | 必要  | 聴取記録を追加           | 実装済み |
| DELETE | `/episodes/{id}/listen`       | 必要  | 聴取記録を削除           | 実装済み |
| GET    | `/episodes/{id}/listen`       | 必要  | 自分がこのエピソードを聴いたか確認 | 実装済み |
| GET    | `/users/me/listening-records` | 必要  | 自分の聴取履歴一覧         | 実装済み |


### Reviews（レビュー）


| メソッド   | パス                            | 認証  | 説明           | 状態   |
| ------ | ----------------------------- | --- | ------------ | ---- |
| POST   | `/episodes/{id}/reviews`      | 必要  | レビュー投稿       | 実装済み |
| GET    | `/episodes/{id}/reviews/mine` | 必要  | 自分のレビュー取得    | 実装済み |
| PUT    | `/episodes/{id}/reviews/mine` | 必要  | 自分のレビュー更新    | 実装済み |
| DELETE | `/episodes/{id}/reviews/mine` | 必要  | 自分のレビュー削除    | 実装済み |
| GET    | `/episodes/{id}/reviews`      | 不要  | エピソードのレビュー一覧 | 実装済み |
| GET    | `/users/me/reviews`           | 必要  | 自分のレビュー一覧    | 実装済み |


### Timeline（タイムライン）


| メソッド | パス          | 認証  | 説明            | 状態   |
| ---- | ----------- | --- | ------------- | ---- |
| GET  | `/timeline` | 不要  | 最新レビューのタイムライン | 実装済み |


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
// 201 Created
{
  "id": "uuid",
  "username": "kosei",
  "display_name": "コウセイ",
  "avatar_url": null,
  "bio": null,
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-10T00:00:00Z"
}

// 409 Conflict（ユーザー名が既に使用されている）
{ "error": "username already taken" }

// 400 Bad Request（バリデーションエラー）
{ "error": "username must be 3-30 characters, alphanumeric and underscores only" }
```

#### GET `/users/me` — 自分のプロフィール取得

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
  "updated_at": "2026-03-10T00:00:00Z"
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
// 200 OK
{
  "id": "uuid",
  "username": "kosei",
  "display_name": "コウセイ（更新）",
  "avatar_url": "https://...",
  "bio": "ラジオとポッドキャストが好き",
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-11T00:00:00Z"
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

#### GET `/users/{username}/reviews` — ユーザーのレビュー一覧（公開）

ユーザーページに表示するレビュー一覧。認証不要。

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "reviews": [
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
      "comment": "神回だった！",
      "created_at": "2026-03-10T00:00:00Z",
      "updated_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 10
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
      "total_reviews": 12
    }
  ],
  "total": 5
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

番組詳細ページ用。番組情報に加えて平均評価とレビュー件数を含む。

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
  "total_reviews": 48,
  "created_at": "2026-03-10T00:00:00Z"
}

// 404 Not Found
{ "error": "podcast not found" }
```

#### GET `/podcasts/{id}/rating` — ポッドキャストの平均評価

ポッドキャストに紐づく全エピソードのレビューから集計する。

**レスポンス**:

```json
// 200 OK
{
  "average_rating": 4.2,
  "total_reviews": 128
}
```

---

### Episodes

#### GET `/podcasts/{id}/episodes` — エピソード一覧取得

番組詳細ページのエピソード一覧用。公開日の新しい順。各エピソードに平均評価・レビュー件数を含む。

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "episodes": [
    {
      "id": "uuid",
      "title": "エピソードタイトル",
      "description": "エピソードの説明...",
      "duration_ms": 3600000,
      "published_at": "2026-03-01T00:00:00Z",
      "average_rating": 4.5,
      "total_reviews": 3
    }
  ],
  "total": 100
}
```

#### GET `/episodes/{id}` — エピソード詳細取得

エピソード詳細ページ用。番組情報、平均評価、レビュー件数を含む。

**レスポンス**:

```json
// 200 OK
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
  "total_reviews": 5,
  "created_at": "2026-03-10T00:00:00Z"
}

// 404 Not Found
{ "error": "episode not found" }
```

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

### Reviews（レビュー）

#### POST `/episodes/{id}/reviews` — レビュー投稿

1ユーザーにつき1エピソード1レビュー。既に投稿済みの場合は 409 を返す。

**リクエスト**:

```json
{
  "rating": 4,
  "comment": "神回だった！後半のフリートークが最高"
}
```

- `rating`: 1〜5 の整数（必須）
- `comment`: テキスト（任意、最大 1000 文字）

**レスポンス**:

```json
// 201 Created
{
  "id": "uuid",
  "user_id": "uuid",
  "episode_id": "uuid",
  "rating": 4,
  "comment": "神回だった！後半のフリートークが最高",
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-10T00:00:00Z"
}

// 409 Conflict
{ "error": "review already exists" }
```

#### GET `/episodes/{id}/reviews/mine` — 自分のレビュー取得

エピソード詳細画面で、自分が既にレビューを書いているか確認し、書いていれば表示するために使用する。

**レスポンス**:

```json
// 200 OK
{
  "id": "uuid",
  "rating": 4,
  "comment": "神回だった！",
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-10T00:00:00Z"
}

// 404 Not Found（レビュー未投稿）
{ "error": "review not found" }
```

#### PUT `/episodes/{id}/reviews/mine` — レビュー更新

**リクエスト**:

```json
{
  "rating": 5,
  "comment": "2回目聴いたら更に良かった"
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
  "comment": "2回目聴いたら更に良かった",
  "created_at": "2026-03-10T00:00:00Z",
  "updated_at": "2026-03-10T12:00:00Z"
}
```

#### DELETE `/episodes/{id}/reviews/mine` — レビュー削除

**レスポンス**:

```json
// 204 No Content
```

#### GET `/episodes/{id}/reviews` — エピソードのレビュー一覧

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "reviews": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "username": "kosei",
        "display_name": "コウセイ",
        "avatar_url": "https://..."
      },
      "rating": 4,
      "comment": "神回だった！",
      "created_at": "2026-03-10T00:00:00Z",
      "updated_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 15,
  "average_rating": 4.2
}
```

#### GET `/users/me/reviews` — 自分のレビュー一覧

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "reviews": [
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
      "comment": "神回だった！",
      "created_at": "2026-03-10T00:00:00Z",
      "updated_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 10
}
```

---

### Timeline（タイムライン）

#### GET `/timeline` — タイムライン

全ユーザーの最新レビューを時系列で表示する。

**クエリパラメータ**: `limit`, `offset`

**レスポンス**:

```json
// 200 OK
{
  "reviews": [
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
        "published_at": "2026-03-01T00:00:00Z",
        "artwork_url": "https://..."
      },
      "podcast": {
        "id": "uuid",
        "title": "ポッドキャスト名",
        "artwork_url": "https://..."
      },
      "rating": 4,
      "comment": "神回だった！",
      "created_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 200
}
```

---

## 変更履歴


| 日付         | 変更内容                                                 |
| ---------- | ---------------------------------------------------- |
| 2026-03-18 | ジャンル一覧 API でサブカテゴリを親カテゴリに集約。検索 API の genre パラメータをサブカテゴリ展開に対応 |
| 2026-03-18 | ジャンル一覧 API (`GET /genres`) を追加。検索 API に `genre` クエリパラメータを追加 |
| 2026-03-11 | 機能要件書・画面仕様書に基づいて全面改訂。不足 API の追加、レスポンス詳細設計の補完、認証要否の修正 |


---

## 更新ルール

API を追加・変更する際は、以下を必ず行うこと:

1. この設計書（api-design.md）のエンドポイント一覧と詳細設計を更新する
2. Swagger コメントを更新し `swag generate` を実行する
3. 状態カラムを「実装済み」に変更する

