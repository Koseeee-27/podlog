-- ratings テーブル
-- ユーザーがエピソードに対して付ける星評価（1〜5）。
-- 1ユーザー1エピソードにつき1件のみ（同一組み合わせは UPDATE で更新）。
-- 感想（comments）とは独立した別オブジェクトで、評価のみ・感想のみ・両方のいずれの組み合わせも可能。
-- 親 Issue: podlog-workspace#59 / 仕様書: podlog#388 / 実装 Issue: podlog#389

CREATE TABLE IF NOT EXISTS ratings (
    id         UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id UUID          NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    rating     SMALLINT      NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 同じユーザーが同じエピソードに2件以上評価できないようにする（重複防止 + 検索高速化）
CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_user_episode
    ON ratings (user_id, episode_id);

-- エピソードの評価一覧取得・平均評価集計用
CREATE INDEX IF NOT EXISTS idx_ratings_episode_id
    ON ratings (episode_id);

-- ユーザーの評価一覧取得用（新しい順）
CREATE INDEX IF NOT EXISTS idx_ratings_user_id_created_at
    ON ratings (user_id, created_at DESC);
