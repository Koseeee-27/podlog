-- 006_create_favorite_podcasts.sql
-- ユーザーの「好きな番組」テーブルを作成する

CREATE TABLE IF NOT EXISTS favorite_podcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
    position SMALLINT NOT NULL DEFAULT 0 CHECK (position >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1ユーザー1番組につき1レコード
CREATE UNIQUE INDEX idx_favorite_podcasts_user_podcast ON favorite_podcasts (user_id, podcast_id);

-- ユーザーごとに表示順で取得する用
CREATE INDEX idx_favorite_podcasts_user_position ON favorite_podcasts (user_id, position);
