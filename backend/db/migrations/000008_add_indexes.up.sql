-- 008_add_indexes.sql
-- 既存テーブルにインデックスを追加・修正する

-- pg_trgm 拡張を有効にする（部分一致検索に必要）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 番組検索用: title と author の部分一致検索を高速化する GIN インデックス
-- カラム別に gin_trgm_ops を指定することで、title ILIKE ... や author ILIKE ... のクエリに対応する
CREATE INDEX IF NOT EXISTS idx_podcasts_title_author_trgm ON podcasts USING gin (
    title gin_trgm_ops,
    author gin_trgm_ops
);

-- feed_url の重複防止用（番組の重複登録を防ぐ）
CREATE UNIQUE INDEX IF NOT EXISTS idx_podcasts_feed_url ON podcasts (feed_url) WHERE feed_url IS NOT NULL;

-- エピソード一覧: podcast_id + published_at DESC の複合インデックス
-- GET /podcasts/{id}/episodes で番組内のエピソードを公開日順に取得する際に使用
CREATE INDEX IF NOT EXISTS idx_episodes_podcast_published ON episodes (podcast_id, published_at DESC);

-- itunes_track_id の部分ユニークインデックス（NULL を除外）
-- 既存の UNIQUE 制約を部分ユニークインデックスに置き換える
ALTER TABLE episodes DROP CONSTRAINT IF EXISTS episodes_itunes_track_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_episodes_itunes_track_id ON episodes (itunes_track_id) WHERE itunes_track_id IS NOT NULL;

-- podcasts の itunes_id も同様に部分ユニークに修正
-- 既存の UNIQUE 制約を削除し、部分ユニークインデックスに置き換える
ALTER TABLE podcasts DROP CONSTRAINT IF EXISTS podcasts_itunes_id_key;
DROP INDEX IF EXISTS idx_podcasts_itunes_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_podcasts_itunes_id ON podcasts (itunes_id) WHERE itunes_id IS NOT NULL;
