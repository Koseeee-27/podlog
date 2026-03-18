-- 聴取記録テーブル
-- ユーザーが「聴いた」エピソードを記録する。1ユーザー1エピソードにつき1レコード。

CREATE TABLE IF NOT EXISTS listening_records (
    id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id UUID        NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同じユーザーが同じエピソードを2回記録できないようにする
CREATE UNIQUE INDEX IF NOT EXISTS idx_listening_records_user_episode
    ON listening_records (user_id, episode_id);

-- ユーザーの聴取履歴一覧（新しい順）取得用
CREATE INDEX IF NOT EXISTS idx_listening_records_user_id_created_at
    ON listening_records (user_id, created_at DESC);

-- エピソードの聴取数カウント用
CREATE INDEX IF NOT EXISTS idx_listening_records_episode_id
    ON listening_records (episode_id);
