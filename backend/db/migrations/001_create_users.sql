-- 001_create_users.sql
-- UUID生成関数を有効化（Supabase では既に有効だが、ローカル開発用に念のため）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users テーブル
-- Supabase Auth の auth.users.id と同じ UUID を PK として使用
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(30)  NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    avatar_url  TEXT,
    bio         TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

-- ソフトデリートされていないユーザーの検索を高速化するインデックス
CREATE INDEX idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NULL;

-- username での検索を高速化
CREATE INDEX idx_users_username ON users (username) WHERE deleted_at IS NULL;
