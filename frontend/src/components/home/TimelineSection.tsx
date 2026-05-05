/**
 * 旧 review ベースのタイムラインセクション。
 *
 * **暫定: 本セクションは P-8 まで非表示**。
 *
 * BE の `/timeline` は podlog#391 系で新 comment ベースのレスポンス
 * （`{ comments, total }`）に切り替わっており、旧 `OldTimelineResult`
 * （`{ reviews, total }`）として受け取ると `data.reviews` が常に `undefined`
 * になる。そのまま動かすと:
 *
 * - 「まだレビューがありません」EmptyState の誤表示
 * - `loadedCount` が増えず「もっと見る」が永遠に押せる無限ループ
 *
 * という UX 障害が起きるため、podlog-workspace#59 の P-8（FE 感想 UI 統合）で
 * comment ベースの新 TimelineSection に置き換えるまで、本コンポーネントは
 * `return null` で非表示にする。
 *
 * `app/(main)/page.tsx` 側の `<TimelineSection />` 呼び出しは保持し、P-8 で
 * 中身だけ差し替える設計（呼び出し側を巻き込まない）。P-8 では:
 * 1. `lib/data/comments.ts::getTimeline`（新 DAL）に切り替え
 * 2. `TimelineCard` を `EpisodeCommentItem` ベースの新カードに置き換え
 * 3. `TimelineLoadMore` も `fetchTimeline`（新 client API）に切り替え
 *
 * 暫定対応中は呼び出し側の props も渡されないため、引数を取らない形にしている
 * （P-8 で `headingLevel` 等のシグネチャを必要に応じて再設計する）。
 */
export default async function TimelineSection() {
  return null;
}
