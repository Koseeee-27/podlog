import { getTimeline } from "@/lib/data/comments";
import TimelineLoadMore from "./TimelineLoadMore";

/** 初回サーバー取得件数。「もっと見る」のページサイズと揃える */
const INITIAL_LIMIT = 20;

/**
 * トップページのタイムラインセクション（新 comment ベース、Server Component）。
 *
 * 評価/感想分離（podlog-workspace#59）の P-8 で、暫定の `return null` 実装
 * （podlog#411 系で導入）から本実装に切替。
 *
 * **本 PR では UI の本格再設計を行わず、データソースを新 `getTimeline`
 * （`lib/data/comments.ts`、`{ comments, total }` 形）に切替えるだけ**。
 * 見出しを「みんなのレビュー」→「みんなの感想」に変更し、TimelineCard も
 * 新 `TimelineItem` 型で動かす。X 風カード化等の UI 本格再設計は
 * podlog-workspace#60 に委譲。
 *
 * 一覧の描画と「もっと見る」のページネーションは `TimelineLoadMore`（Client）に
 * 一元化している。SC では初回取得とセクション枠（見出し）だけを担当し、初回分も
 * 含めて `TimelineLoadMore` が全件 state で管理する（`CommentListLoader` /
 * `EpisodeCommentSectionClient` と同じパターン）。これにより offset ベースの
 * ページ境界ずれによる重複表示を `prev` ベース dedupe で防げる。
 *
 * `getTimeline` は `revalidate: 60` + `["timeline"]` タグでキャッシュされる。
 * 感想投稿時に `revalidateTag("timeline")` で個別無効化可能。
 */
export default async function TimelineSection() {
  const data = await getTimeline(INITIAL_LIMIT, 0);

  // 感想が 0 件のときはセクション自体を出さない（旧実装の挙動を踏襲）。
  if (data.comments.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 mb-4">みんなの感想</h2>

      <TimelineLoadMore
        initialComments={data.comments}
        initialTotal={data.total}
      />
    </section>
  );
}
