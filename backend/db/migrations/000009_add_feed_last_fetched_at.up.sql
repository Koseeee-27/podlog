-- podcasts テーブルに feed_last_fetched_at カラムを追加
-- RSS フィードの最終取得日時を記録し、Stale-While-Revalidate 方式のキャッシュ判定に使用する
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS feed_last_fetched_at TIMESTAMPTZ;
