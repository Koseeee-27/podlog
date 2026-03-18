-- podcasts_itunes_id: 元の UNIQUE 制約に戻す
DROP INDEX IF EXISTS idx_podcasts_itunes_id;
ALTER TABLE podcasts ADD CONSTRAINT podcasts_itunes_id_key UNIQUE (itunes_id);

-- episodes_itunes_track_id: 元の UNIQUE 制約に戻す
DROP INDEX IF EXISTS idx_episodes_itunes_track_id;
ALTER TABLE episodes ADD CONSTRAINT episodes_itunes_track_id_key UNIQUE (itunes_track_id);

DROP INDEX IF EXISTS idx_episodes_podcast_published;
DROP INDEX IF EXISTS idx_podcasts_feed_url;
DROP INDEX IF EXISTS idx_podcasts_title_author_trgm;
DROP EXTENSION IF EXISTS pg_trgm;
