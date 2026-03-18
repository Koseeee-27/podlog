-- 007_create_podcast_requests.sql
-- 番組追加リクエストテーブルを作成する

CREATE TABLE IF NOT EXISTS podcast_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_podcast_requests_user_id ON podcast_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_requests_status ON podcast_requests (status);
