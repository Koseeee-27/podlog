-- reviews テーブルの削除
-- 評価/感想分離（podlog-workspace#59）の一環で reviews を廃止し、
-- ratings（000010）と comments（000011）に責務を分割する。
--
-- 注: 000005（create_reviews）と 000008（add_indexes 内で reviews への直接 DDL なし）
-- で作られた reviews テーブル + インデックス群は、本マイグレーションですべて drop される前提。
-- リリース前のため、既存 reviews データの ratings / comments への移行は行わない。

DROP INDEX IF EXISTS idx_reviews_created_at;
DROP INDEX IF EXISTS idx_reviews_user_id_created_at;
DROP INDEX IF EXISTS idx_reviews_episode_id;
DROP INDEX IF EXISTS idx_reviews_user_episode;
DROP TABLE IF EXISTS reviews;
