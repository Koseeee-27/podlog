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

-- feed_url の重複を解消してからユニークインデックスを作成する
-- 方針: 各重複グループの中で関連 episodes が最も多い（同数なら id が最小の）レコードを「残す」レコードとし、
--       それ以外のレコードの episodes を「残す」レコードに付け替えてから、重複レコードを削除する。
-- NOTE: episodes には (podcast_id, guid) のユニークインデックスがあるため、
--       guid が衝突する場合は付け替えずに削除側に残す（CASCADE で消える）。

-- 1. 重複レコードの episodes を「残す」レコードに付け替える（guid 衝突がないもののみ）
UPDATE episodes e
SET podcast_id = keep.id
FROM (
    -- 各重複 feed_url グループで「残す」レコードを決定
    SELECT DISTINCT ON (feed_url) id, feed_url
    FROM podcasts
    WHERE feed_url IN (
        SELECT feed_url FROM podcasts
        WHERE feed_url IS NOT NULL
        GROUP BY feed_url HAVING COUNT(*) > 1
    )
    ORDER BY feed_url,
             (SELECT COUNT(*) FROM episodes WHERE podcast_id = podcasts.id) DESC,
             id ASC
) keep
WHERE e.podcast_id IN (
    -- 「削除する」レコード（同じ feed_url を持つが keep ではないもの）
    SELECT p2.id FROM podcasts p2
    WHERE p2.feed_url = keep.feed_url AND p2.id != keep.id
)
-- guid 衝突を避ける: 移行先に同じ guid が既にある場合はスキップ
AND NOT EXISTS (
    SELECT 1 FROM episodes e2
    WHERE e2.podcast_id = keep.id AND e2.guid = e.guid
);

-- 2. favorite_podcasts も同様に付け替える（重複する user_id + podcast_id がなければ）
UPDATE favorite_podcasts fp
SET podcast_id = keep.id
FROM (
    SELECT DISTINCT ON (feed_url) id, feed_url
    FROM podcasts
    WHERE feed_url IN (
        SELECT feed_url FROM podcasts
        WHERE feed_url IS NOT NULL
        GROUP BY feed_url HAVING COUNT(*) > 1
    )
    ORDER BY feed_url,
             (SELECT COUNT(*) FROM episodes WHERE podcast_id = podcasts.id) DESC,
             id ASC
) keep
WHERE fp.podcast_id IN (
    SELECT p2.id FROM podcasts p2
    WHERE p2.feed_url = keep.feed_url AND p2.id != keep.id
)
AND NOT EXISTS (
    SELECT 1 FROM favorite_podcasts fp2
    WHERE fp2.podcast_id = keep.id AND fp2.user_id = fp.user_id
);

-- 3. 重複レコード（残さない方）を削除（CASCADE で残った episodes/reviews/favorites も消える）
DELETE FROM podcasts
WHERE id IN (
    SELECT p.id
    FROM podcasts p
    INNER JOIN (
        SELECT DISTINCT ON (feed_url) id, feed_url
        FROM podcasts
        WHERE feed_url IN (
            SELECT feed_url FROM podcasts
            WHERE feed_url IS NOT NULL
            GROUP BY feed_url HAVING COUNT(*) > 1
        )
        ORDER BY feed_url,
                 (SELECT COUNT(*) FROM episodes WHERE podcast_id = podcasts.id) DESC,
                 id ASC
    ) keep ON p.feed_url = keep.feed_url AND p.id != keep.id
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
