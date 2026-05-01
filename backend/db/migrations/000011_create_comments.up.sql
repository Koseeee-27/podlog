-- comments テーブル
-- ユーザーがエピソードに対して投稿するテキスト感想。
-- **1ユーザー1エピソードに対して複数件投稿可能**（unique 制約なし）。
-- 評価（ratings）とは独立した別オブジェクトで、評価のみ・感想のみ・両方のいずれの組み合わせも可能。
-- 親 Issue: podlog-workspace#59 / 仕様書: podlog#388 / 実装 Issue: podlog#389

-- カラム名は `body`（テーブル名 `comments` と同名カラム `comment` を避けて SQL の可読性を上げる）。
-- 既存 reviews テーブルでは `comment` だったが、新テーブルでは別名を採用する。
CREATE TABLE IF NOT EXISTS comments (
    id         UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id UUID          NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    body       VARCHAR(1000) NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    -- 空文字を禁止し、上限も明示する。VARCHAR(1000) と二重ガード。
    CONSTRAINT comments_body_length_check
        CHECK (char_length(body) >= 1 AND char_length(body) <= 1000)
);

-- エピソード詳細の感想一覧（新しい順）
CREATE INDEX IF NOT EXISTS idx_comments_episode_id_created_at
    ON comments (episode_id, created_at DESC);

-- ユーザーの感想一覧（新しい順）
CREATE INDEX IF NOT EXISTS idx_comments_user_id_created_at
    ON comments (user_id, created_at DESC);

-- グローバルタイムライン（全ユーザーの最新感想）
CREATE INDEX IF NOT EXISTS idx_comments_created_at
    ON comments (created_at DESC);
