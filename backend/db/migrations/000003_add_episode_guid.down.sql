DROP INDEX IF EXISTS idx_episodes_podcast_id_guid;
ALTER TABLE episodes DROP COLUMN IF EXISTS guid;
