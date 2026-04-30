-- 000011 のロールバック: comments テーブルとインデックスを削除する。

DROP INDEX IF EXISTS idx_comments_created_at;
DROP INDEX IF EXISTS idx_comments_user_id_created_at;
DROP INDEX IF EXISTS idx_comments_episode_id_created_at;
DROP TABLE IF EXISTS comments;
