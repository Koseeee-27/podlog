-- エピソードの重複検知用に guid カラムを追加
-- RSS フィードの <guid> タグに対応し、同じポッドキャスト内での重複を防ぐ

ALTER TABLE episodes ADD COLUMN guid TEXT;

-- 同一ポッドキャスト内で同じ GUID のエピソードを防ぐ部分ユニークインデックス
-- guid が NULL のレコードは制約の対象外（既存データに影響しない）
CREATE UNIQUE INDEX idx_episodes_podcast_id_guid
    ON episodes (podcast_id, guid)
    WHERE guid IS NOT NULL;
