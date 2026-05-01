-- 000012_drop_reviews.down.sql
-- 000012 のロールバック: reviews テーブルとインデックス群を再作成する。
--
-- 000005_create_reviews.up.sql の内容を完全に再現する（000008_add_indexes は reviews に対する
-- 直接 DDL を含まない。reviews への CASCADE DELETE はあるが、テーブル定義への影響はない）。
-- down を流すと再びテーブルは空の状態で再作成され、ratings / comments とは独立した状態になる
-- （ratings / comments のロールバックは 000010 / 000011 の down で行う）。
--
-- CHECK 制約は名前付きで宣言する（自動命名に依存しないため。`backend.md` のルール参照）。
-- 旧 000005_create_reviews.up.sql は無名の CHECK だったが、down で復元する際は名前付きに揃える。
CREATE TABLE IF NOT EXISTS reviews (
    id         UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id UUID          NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    rating     SMALLINT      NOT NULL,
    comment    VARCHAR(1000),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5)
);

-- 同じユーザーが同じエピソードに2つレビューを書けないようにする
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_episode
    ON reviews (user_id, episode_id);

-- エピソードのレビュー一覧取得・平均評価集計用
CREATE INDEX IF NOT EXISTS idx_reviews_episode_id
    ON reviews (episode_id);

-- ユーザーのレビュー一覧取得用
CREATE INDEX IF NOT EXISTS idx_reviews_user_id_created_at
    ON reviews (user_id, created_at DESC);

-- タイムライン（全ユーザーの最新レビュー）用
CREATE INDEX IF NOT EXISTS idx_reviews_created_at
    ON reviews (created_at DESC);
