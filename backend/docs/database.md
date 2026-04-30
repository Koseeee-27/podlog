# データベース仕様書

## ER 図

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR(30) username UK
        VARCHAR(50) display_name
        TEXT avatar_url
        TEXT bio
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        TIMESTAMPTZ deleted_at
    }

    podcasts {
        UUID id PK
        BIGINT itunes_id "部分ユニークインデックス"
        VARCHAR(500) title
        VARCHAR(300) author
        TEXT description
        TEXT feed_url
        TEXT artwork_url
        TEXT itunes_url
        VARCHAR(100) genre
        VARCHAR(20) source_type
        TEXT source_url
        TIMESTAMPTZ feed_last_fetched_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    episodes {
        UUID id PK
        UUID podcast_id FK
        BIGINT itunes_track_id "部分ユニークインデックス"
        VARCHAR(500) title
        TEXT description
        TEXT audio_url
        TEXT artwork_url
        TEXT source_url
        BIGINT duration_ms
        TEXT guid
        TIMESTAMPTZ published_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    listening_records {
        UUID id PK
        UUID user_id FK
        UUID episode_id FK
        TIMESTAMPTZ created_at
    }

    ratings {
        UUID id PK
        UUID user_id FK
        UUID episode_id FK
        SMALLINT rating
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    comments {
        UUID id PK
        UUID user_id FK
        UUID episode_id FK
        VARCHAR(1000) body
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    favorite_podcasts {
        UUID id PK
        UUID user_id FK
        UUID podcast_id FK
        SMALLINT position
        TIMESTAMPTZ created_at
    }

    podcast_requests {
        UUID id PK
        UUID user_id FK
        VARCHAR(500) title
        TEXT url
        VARCHAR(20) status
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    podcasts ||--o{ episodes : "has many"
    users ||--o{ listening_records : "has many"
    episodes ||--o{ listening_records : "has many"
    users ||--o{ ratings : "has many"
    episodes ||--o{ ratings : "has many"
    users ||--o{ comments : "has many"
    episodes ||--o{ comments : "has many"
    users ||--o{ favorite_podcasts : "has many"
    podcasts ||--o{ favorite_podcasts : "has many"
    users ||--o{ podcast_requests : "has many"
```

## テーブル定義

### users

Supabase Auth の `auth.users.id` と同じ UUID を PK として使用する。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK。Supabase Auth の user ID と一致 |
| username | VARCHAR(30) | NO | - | ユニーク。公開プロフィールの URL に使用 |
| display_name | VARCHAR(50) | NO | - | 表示名 |
| avatar_url | TEXT | YES | - | アバター画像 URL |
| bio | TEXT | YES | - | 自己紹介文 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |
| deleted_at | TIMESTAMPTZ | YES | - | ソフトデリート用。NULL = 有効 |

### podcasts

ポッドキャスト番組。iTunes / Radiko / 手動入力の3ソースに対応。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| itunes_id | BIGINT | YES | - | iTunes の ID。iTunes 以外は NULL |
| title | VARCHAR(500) | NO | - | 番組タイトル |
| author | VARCHAR(300) | YES | - | 配信者名 |
| description | TEXT | YES | - | 番組説明 |
| feed_url | TEXT | YES | - | RSS フィード URL |
| artwork_url | TEXT | YES | - | アートワーク画像 URL |
| itunes_url | TEXT | YES | - | iTunes ページ URL |
| genre | VARCHAR(100) | YES | - | ジャンル |
| source_type | VARCHAR(20) | NO | 'itunes' | ソース種別: 'itunes' / 'radiko' / 'manual' |
| source_url | TEXT | YES | - | 元ソースの URL |
| feed_last_fetched_at | TIMESTAMPTZ | YES | - | RSS フィードの最終取得日時。Stale-While-Revalidate のキャッシュ判定に使用 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

### episodes

ポッドキャストのエピソード（回）。podcasts と 1:N の関係。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| podcast_id | UUID | NO | - | FK → podcasts.id（CASCADE DELETE） |
| itunes_track_id | BIGINT | YES | - | iTunes のトラック ID |
| title | VARCHAR(500) | NO | - | エピソードタイトル |
| description | TEXT | YES | - | エピソード説明 |
| audio_url | TEXT | YES | - | 音声ファイル URL |
| artwork_url | TEXT | YES | - | エピソード固有のアートワーク URL |
| source_url | TEXT | YES | - | 元ソースの URL |
| duration_ms | BIGINT | YES | - | 再生時間（ミリ秒） |
| guid | TEXT | YES | - | RSS フィードの GUID。重複検知用 |
| published_at | TIMESTAMPTZ | YES | - | 公開日時 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

### listening_records

ユーザーの聴取記録。1ユーザー1エピソードにつき1レコード。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | - | FK → users.id（CASCADE DELETE） |
| episode_id | UUID | NO | - | FK → episodes.id（CASCADE DELETE） |
| created_at | TIMESTAMPTZ | NO | NOW() | 記録日時 |

### ratings

ユーザーの星評価（1〜5）。1ユーザー1エピソードにつき1件（重複不可、編集で更新する。重複防止は `idx_ratings_user_episode` の `(user_id, episode_id)` ユニークインデックスで担保する）。感想（comments）とは独立した別オブジェクトで、評価のみ・感想のみ・両方のいずれの組み合わせも可能。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | - | FK → users.id（CASCADE DELETE） |
| episode_id | UUID | NO | - | FK → episodes.id（CASCADE DELETE） |
| rating | SMALLINT | NO | - | 評価（1〜5） |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

### comments

ユーザーのテキスト感想。**1ユーザー1エピソードに対して複数件投稿可能**（重複制限なし）。評価（ratings）とは独立した別オブジェクトで、評価のみ・感想のみ・両方のいずれの組み合わせも可能。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | - | FK → users.id（CASCADE DELETE） |
| episode_id | UUID | NO | - | FK → episodes.id（CASCADE DELETE） |
| body | VARCHAR(1000) | NO | - | 感想本文（最大 1000 文字。短文〜長文まで対応するが、フォーム UI は短文を前提に設計する） |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

### favorite_podcasts

ユーザーの「好きな番組」。ユーザーページのプロフィールに表示する。`PUT /users/me/favorite-podcasts` で一括更新される（既存レコードを全削除してから再挿入する）。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | - | FK → users.id（CASCADE DELETE） |
| podcast_id | UUID | NO | - | FK → podcasts.id（CASCADE DELETE） |
| position | SMALLINT | NO | - | 表示順序（0始まり）。ユーザーが並べた順を保持する（常に明示的に指定する） |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

### podcast_requests

ユーザーからの番組追加リクエスト。検索で見つからない番組の追加を依頼する機能で使用する。管理者が確認してステータスを更新する運用を想定。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | - | FK → users.id（CASCADE DELETE）。リクエストしたユーザー |
| title | VARCHAR(500) | NO | - | リクエストする番組名 |
| url | TEXT | YES | - | 番組の URL（Apple Podcasts / Spotify 等）。任意 |
| status | VARCHAR(20) | NO | 'pending' | ステータス: 'pending'（未対応）/ 'approved'（承認済み）/ 'rejected'（却下） |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

## インデックス

| テーブル | インデックス名 | カラム | 種別 | 条件 |
|---|---|---|---|---|
| users | idx_users_deleted_at | deleted_at | 部分 | WHERE deleted_at IS NULL |
| users | idx_users_username | username | 部分 | WHERE deleted_at IS NULL |
| podcasts | idx_podcasts_itunes_id | itunes_id | 部分ユニーク | WHERE itunes_id IS NOT NULL |
| podcasts | idx_podcasts_title | title | 通常 | - |
| podcasts | idx_podcasts_feed_url | feed_url | 部分ユニーク | WHERE feed_url IS NOT NULL |
| podcasts | idx_podcasts_title_author_trgm | (title, author) | GIN (pg_trgm) | - |
| episodes | idx_episodes_podcast_id | podcast_id | 通常 | - |
| episodes | idx_episodes_published_at | published_at DESC | 通常 | - |
| episodes | idx_episodes_podcast_published | (podcast_id, published_at DESC) | 通常 | - |
| episodes | idx_episodes_itunes_track_id | itunes_track_id | 部分ユニーク | WHERE itunes_track_id IS NOT NULL |
| episodes | idx_episodes_podcast_id_guid | (podcast_id, guid) | 部分ユニーク | WHERE guid IS NOT NULL |
| listening_records | idx_listening_records_user_episode | (user_id, episode_id) | ユニーク | - |
| listening_records | idx_listening_records_user_id_created_at | (user_id, created_at DESC) | 通常 | - |
| listening_records | idx_listening_records_episode_id | episode_id | 通常 | - |
| ratings | idx_ratings_user_episode | (user_id, episode_id) | ユニーク | - |
| ratings | idx_ratings_episode_id | episode_id | 通常 | - |
| ratings | idx_ratings_user_id_created_at | (user_id, created_at DESC) | 通常 | - |
| comments | idx_comments_episode_id_created_at | (episode_id, created_at DESC) | 通常 | エピソード詳細の感想一覧（新しい順） |
| comments | idx_comments_user_id_created_at | (user_id, created_at DESC) | 通常 | ユーザーの感想一覧 |
| comments | idx_comments_created_at | created_at DESC | 通常 | グローバルタイムライン |
| favorite_podcasts | idx_favorite_podcasts_user_podcast | (user_id, podcast_id) | ユニーク | - |
| favorite_podcasts | idx_favorite_podcasts_user_position | (user_id, position) | ユニーク | - |
| podcast_requests | idx_podcast_requests_user_id | user_id | 通常 | - |
| podcast_requests | idx_podcast_requests_status | status | 通常 | - |

## 制約

| テーブル | 制約 | 種別 | 説明 |
|---|---|---|---|
| users | users_pkey | PRIMARY KEY | id |
| users | users_username_key | UNIQUE | username |
| podcasts | podcasts_pkey | PRIMARY KEY | id |
| episodes | episodes_pkey | PRIMARY KEY | id |
| episodes | episodes_podcast_id_fkey | FOREIGN KEY | podcast_id → podcasts.id (CASCADE DELETE) |
| listening_records | listening_records_pkey | PRIMARY KEY | id |
| listening_records | listening_records_user_id_fkey | FOREIGN KEY | user_id → users.id (CASCADE DELETE) |
| listening_records | listening_records_episode_id_fkey | FOREIGN KEY | episode_id → episodes.id (CASCADE DELETE) |
| ratings | ratings_pkey | PRIMARY KEY | id |
| ratings | ratings_user_id_fkey | FOREIGN KEY | user_id → users.id (CASCADE DELETE) |
| ratings | ratings_episode_id_fkey | FOREIGN KEY | episode_id → episodes.id (CASCADE DELETE) |
| ratings | ratings_rating_check | CHECK | rating >= 1 AND rating <= 5 |
| comments | comments_pkey | PRIMARY KEY | id |
| comments | comments_user_id_fkey | FOREIGN KEY | user_id → users.id (CASCADE DELETE) |
| comments | comments_episode_id_fkey | FOREIGN KEY | episode_id → episodes.id (CASCADE DELETE) |
| comments | comments_body_length_check | CHECK | char_length(body) >= 1 AND char_length(body) <= 1000 |
| favorite_podcasts | favorite_podcasts_pkey | PRIMARY KEY | id |
| favorite_podcasts | favorite_podcasts_user_id_fkey | FOREIGN KEY | user_id → users.id (CASCADE DELETE) |
| favorite_podcasts | favorite_podcasts_podcast_id_fkey | FOREIGN KEY | podcast_id → podcasts.id (CASCADE DELETE) |
| favorite_podcasts | favorite_podcasts_position_check | CHECK | position >= 0 |
| podcast_requests | podcast_requests_pkey | PRIMARY KEY | id |
| podcast_requests | podcast_requests_user_id_fkey | FOREIGN KEY | user_id → users.id (CASCADE DELETE) |
| podcast_requests | podcast_requests_status_check | CHECK | status IN ('pending', 'approved', 'rejected') |

## 設計方針

- **PK**: すべて UUID（gen_random_uuid()）
- **ソフトデリート**: users テーブルのみ対応（deleted_at カラム）
- **タイムスタンプ**: 全テーブルに created_at を持つ。更新が発生するテーブルには updated_at も持つ（TIMESTAMPTZ）
- **命名規則**: スネークケース。テーブル名は複数形
- **マイグレーション**: `backend/db/migrations/` に連番 SQL ファイルで管理
- **番組の重複防止**: `feed_url` の部分ユニークインデックスと `itunes_id` の部分ユニークインデックスにより、同じ番組が複数登録されることを防ぐ
- **NULL 許容カラムのユニーク制約**: `itunes_id`、`itunes_track_id`、`feed_url` など NULL を許容するカラムのユニーク制約は、部分インデックス（`WHERE ... IS NOT NULL`）で実現する。PostgreSQL の通常の UNIQUE 制約は NULL を複数許容するが、意図を明示するために部分ユニークインデックスを使用する
- **番組検索**: `pg_trgm` 拡張の GIN インデックスにより、部分一致・あいまい検索を高速に処理する

## 変更履歴

| 日付 | 変更内容 |
|---|---|
| 2026-04-30 | コアコンセプト転換に伴う評価/感想分離: `reviews` テーブルを廃止し、`ratings`（星評価のみ、1ユーザー1エピソード=1件）と `comments`（テキスト感想、1ユーザー1エピソードに複数件投稿可）の2テーブルに分離。インデックス・制約も新モデルに合わせて再設計（podlog#388 / 親 Issue: podlog-workspace#59）。マイグレーション SQL は podlog#389 で実装する |
| 2026-04-07 | podcasts テーブルに feed_last_fetched_at カラムを追加（マイグレーション 009） |
| 2026-03-21 | マイグレーション 001〜008 との突き合わせを実施し、差分がないことを確認 |
| 2026-03-11 | 機能要件書・API設計書に基づいて全面改訂。favorite_podcasts・podcast_requests テーブルの追加、インデックス・制約の整理、設計方針の補完 |

## 更新ルール

テーブルを追加・変更する際は、以下を必ず行うこと:

1. `backend/db/migrations/` に新しい連番 SQL ファイルを作成する
2. この仕様書（database.md）の ER 図・テーブル定義・インデックス・制約を更新する
