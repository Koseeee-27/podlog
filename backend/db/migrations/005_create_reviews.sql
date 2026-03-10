-- レビューテーブル
-- ユーザーがエピソードに対して評価とコメントを残す。1ユーザー1エピソードにつき1レビュー。

CREATE TABLE reviews (
    id         UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id UUID          NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    rating     SMALLINT      NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment    VARCHAR(1000),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 同じユーザーが同じエピソードに2つレビューを書けないようにする
CREATE UNIQUE INDEX idx_reviews_user_episode
    ON reviews (user_id, episode_id);

-- エピソードのレビュー一覧取得・平均評価集計用
CREATE INDEX idx_reviews_episode_id
    ON reviews (episode_id);

-- ユーザーのレビュー一覧取得用
CREATE INDEX idx_reviews_user_id_created_at
    ON reviews (user_id, created_at DESC);

-- タイムライン（全ユーザーの最新レビュー）用
CREATE INDEX idx_reviews_created_at
    ON reviews (created_at DESC);
