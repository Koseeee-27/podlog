-- 002_create_podcasts_episodes.sql

-- podcasts テーブル
CREATE TABLE IF NOT EXISTS podcasts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itunes_id    BIGINT UNIQUE,                              -- iTunes以外のソースはNULL
    title        VARCHAR(500)  NOT NULL,
    author       VARCHAR(300),
    description  TEXT,
    feed_url     TEXT,
    artwork_url  TEXT,
    itunes_url   TEXT,
    genre        VARCHAR(100),
    source_type  VARCHAR(20)   NOT NULL DEFAULT 'itunes',    -- 'itunes' / 'radiko' / 'manual'
    source_url   TEXT,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- iTunes ID での検索を高速化
CREATE INDEX idx_podcasts_itunes_id ON podcasts (itunes_id) WHERE itunes_id IS NOT NULL;

-- タイトル検索用（部分一致対応のため pg_trgm を使うことも検討）
CREATE INDEX idx_podcasts_title ON podcasts (title);

-- episodes テーブル
CREATE TABLE IF NOT EXISTS episodes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    podcast_id       UUID         NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
    itunes_track_id  BIGINT UNIQUE,                          -- iTunes以外のソースはNULL
    title            VARCHAR(500) NOT NULL,
    description      TEXT,
    audio_url        TEXT,
    artwork_url      TEXT,
    source_url       TEXT,
    duration_ms      BIGINT,
    published_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ポッドキャストIDでのエピソード取得を高速化
CREATE INDEX idx_episodes_podcast_id ON episodes (podcast_id);

-- 公開日順でのソートを高速化
CREATE INDEX idx_episodes_published_at ON episodes (published_at DESC);
