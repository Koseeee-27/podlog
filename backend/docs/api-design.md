# API 設計書

## 共通仕様

- **ベースパス**: `/api/v1`
- **形式**: JSON
- **認証**: Supabase JWT を `Authorization: Bearer <token>` ヘッダーで送信
- **エラーレスポンス**: `{ "error": "メッセージ" }`
- **ページネーション**: `limit`（デフォルト 20）+ `offset`（デフォルト 0）をクエリパラメータで指定

## エンドポイント一覧

### ヘルスチェック

| メソッド | パス | 認証 | 説明 | 状態 |
|---|---|---|---|---|
| GET | `/health` | 不要 | サーバー稼働確認 | 実装済み |

### Users

| メソッド | パス | 認証 | 説明 | 状態 |
|---|---|---|---|---|
| POST | `/users/profile` | 必要 | 初回プロフィール作成 | 実装済み |
| GET | `/users/me` | 必要 | 自分のプロフィール取得 | 実装済み |
| PUT | `/users/me` | 必要 | プロフィール更新 | 実装済み |
| GET | `/users/{username}` | 不要 | 公開プロフィール取得 | 実装済み |

### Podcasts

| メソッド | パス | 認証 | 説明 | 状態 |
|---|---|---|---|---|
| GET | `/podcasts/search` | 必要 | iTunes API でポッドキャスト検索 | 実装済み |
| POST | `/podcasts/fetch-url` | 必要 | URL から OGP 情報取得 | 実装済み |
| GET | `/podcasts/{id}` | 不要 | ポッドキャスト詳細取得 | 実装済み |

### Episodes

| メソッド | パス | 認証 | 説明 | 状態 |
|---|---|---|---|---|
| GET | `/podcasts/{id}/episodes` | 不要 | エピソード一覧取得 | 実装済み |
| POST | `/podcasts/{id}/episodes` | 必要 | エピソード作成 | 実装済み |
| POST | `/podcasts/{id}/episodes/fetch` | 必要 | RSS フィードからエピソード取得 | 実装済み |
| GET | `/episodes/{id}` | 不要 | エピソード詳細取得 | 実装済み |

### Listening Records（聴取記録）

| メソッド | パス | 認証 | 説明 | 状態 |
|---|---|---|---|---|
| POST | `/episodes/{id}/listen` | 必要 | 聴取記録を追加 | 実装済み |
| DELETE | `/episodes/{id}/listen` | 必要 | 聴取記録を削除 | 実装済み |
| GET | `/episodes/{id}/listen` | 必要 | 自分がこのエピソードを聴いたか確認 | 実装済み |
| GET | `/users/me/listening-records` | 必要 | 自分の聴取履歴一覧 | 実装済み |

### Reviews（レビュー）

| メソッド | パス | 認証 | 説明 | 状態 |
|---|---|---|---|---|
| POST | `/episodes/{id}/reviews` | 必要 | レビュー投稿 | 実装済み |
| PUT | `/episodes/{id}/reviews/mine` | 必要 | 自分のレビュー更新 | 実装済み |
| DELETE | `/episodes/{id}/reviews/mine` | 必要 | 自分のレビュー削除 | 実装済み |
| GET | `/episodes/{id}/reviews` | 不要 | エピソードのレビュー一覧 | 実装済み |
| GET | `/podcasts/{id}/rating` | 不要 | ポッドキャストの平均評価 | 実装済み |
| GET | `/users/me/reviews` | 必要 | 自分のレビュー一覧 | 実装済み |

### Timeline（タイムライン）

| メソッド | パス | 認証 | 説明 | 状態 |
|---|---|---|---|---|
| GET | `/timeline` | 不要 | 最新レビューのタイムライン | 実装済み |

---

## MVP 新規 API 詳細設計

### POST `/episodes/{id}/listen` — 聴取記録を追加

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

### DELETE `/episodes/{id}/listen` — 聴取記録を削除

**リクエスト**: ボディなし

**レスポンス**:
```json
// 204 No Content
```

### GET `/episodes/{id}/listen` — 聴取状態確認

**レスポンス**:
```json
// 200 OK
{
  "listened": true,
  "listened_at": "2026-03-10T00:00:00Z"
}
```

### GET `/users/me/listening-records` — 聴取履歴一覧

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

### POST `/episodes/{id}/reviews` — レビュー投稿

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

### PUT `/episodes/{id}/reviews/mine` — レビュー更新

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

### DELETE `/episodes/{id}/reviews/mine` — レビュー削除

**レスポンス**:
```json
// 204 No Content
```

### GET `/episodes/{id}/reviews` — エピソードのレビュー一覧

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
      "created_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 15,
  "average_rating": 4.2
}
```

### GET `/podcasts/{id}/rating` — ポッドキャストの平均評価

ポッドキャストに紐づく全エピソードのレビューから集計する。

**レスポンス**:
```json
// 200 OK
{
  "average_rating": 4.2,
  "total_reviews": 128
}
```

### GET `/users/me/reviews` — 自分のレビュー一覧

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
      "created_at": "2026-03-10T00:00:00Z"
    }
  ],
  "total": 10
}
```

### GET `/timeline` — タイムライン

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

## 更新ルール

API を追加・変更する際は、以下を必ず行うこと:

1. この設計書（api-design.md）のエンドポイント一覧と詳細設計を更新する
2. Swagger コメントを更新し `swag generate` を実行する
3. 状態カラムを「実装済み」に変更する
