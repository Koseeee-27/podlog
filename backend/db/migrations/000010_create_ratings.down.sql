-- 000010 のロールバック: ratings テーブルとインデックスを削除する。
-- インデックスはテーブル削除で自動的に消えるが、明示的に DROP して意図を残す。

DROP INDEX IF EXISTS idx_ratings_user_id_created_at;
DROP INDEX IF EXISTS idx_ratings_episode_id;
DROP INDEX IF EXISTS idx_ratings_user_episode;
DROP TABLE IF EXISTS ratings;
