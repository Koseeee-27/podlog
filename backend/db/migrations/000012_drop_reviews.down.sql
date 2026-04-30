-- 000012 のロールバック: reviews テーブルとインデックス群を再作成する。
-- 000005_create_reviews.up.sql の内容を完全に再現する（000008 では reviews への直接 DDL はない）。
-- 仮にこの down を流すと再びテーブルは空の状態で再作成され、
-- ratings / comments とは独立した状態になる（ratings / comments のロールバックは 000010 / 000011 の down で行う）。

CREATE TABLE IF NOT EXISTS reviews (
    id         UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id UUID          NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    rating     SMALLINT      NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment    VARCHAR(1000),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_episode
    ON reviews (user_id, episode_id);

CREATE INDEX IF NOT EXISTS idx_reviews_episode_id
    ON reviews (episode_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id_created_at
    ON reviews (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_created_at
    ON reviews (created_at DESC);
