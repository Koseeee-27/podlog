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
        BIGINT itunes_id UK
        VARCHAR(500) title
        VARCHAR(300) author
        TEXT description
        TEXT feed_url
        TEXT artwork_url
        TEXT itunes_url
        VARCHAR(100) genre
        VARCHAR(20) source_type
        TEXT source_url
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    episodes {
        UUID id PK
        UUID podcast_id FK
        BIGINT itunes_track_id UK
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

    podcasts ||--o{ episodes : "has many"
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

## インデックス

| テーブル | インデックス名 | カラム | 種別 | 条件 |
|---|---|---|---|---|
| users | idx_users_deleted_at | deleted_at | 部分 | WHERE deleted_at IS NULL |
| users | idx_users_username | username | 部分 | WHERE deleted_at IS NULL |
| podcasts | idx_podcasts_itunes_id | itunes_id | 部分 | WHERE itunes_id IS NOT NULL |
| podcasts | idx_podcasts_title | title | 通常 | - |
| episodes | idx_episodes_podcast_id | podcast_id | 通常 | - |
| episodes | idx_episodes_published_at | published_at DESC | 通常 | - |
| episodes | idx_episodes_podcast_id_guid | (podcast_id, guid) | ユニーク部分 | WHERE guid IS NOT NULL |

## 制約

| テーブル | 制約 | 種別 | 説明 |
|---|---|---|---|
| users | users_pkey | PRIMARY KEY | id |
| users | users_username_key | UNIQUE | username |
| podcasts | podcasts_pkey | PRIMARY KEY | id |
| podcasts | podcasts_itunes_id_key | UNIQUE | itunes_id |
| episodes | episodes_pkey | PRIMARY KEY | id |
| episodes | episodes_itunes_track_id_key | UNIQUE | itunes_track_id |
| episodes | episodes_podcast_id_fkey | FOREIGN KEY | podcast_id → podcasts.id (CASCADE DELETE) |

## 設計方針

- **PK**: すべて UUID（gen_random_uuid()）
- **ソフトデリート**: users テーブルのみ対応（deleted_at カラム）
- **タイムスタンプ**: 全テーブルに created_at / updated_at を持つ（TIMESTAMPTZ）
- **命名規則**: スネークケース。テーブル名は複数形
- **マイグレーション**: `backend/db/migrations/` に連番 SQL ファイルで管理

## 更新ルール

テーブルを追加・変更する際は、以下を必ず行うこと:

1. `backend/db/migrations/` に新しい連番 SQL ファイルを作成する
2. この仕様書（database.md）の ER 図・テーブル定義・インデックス・制約を更新する
