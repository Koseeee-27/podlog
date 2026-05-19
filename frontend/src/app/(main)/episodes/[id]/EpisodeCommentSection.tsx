import { getEpisodeComments } from "@/lib/data/comments";
import { getViewer, type Viewer } from "@/lib/auth/getViewer";
import EpisodeCommentSectionClient from "./EpisodeCommentSectionClient";

/** 初回サーバー取得件数。「もっと見る」のページサイズと揃える */
const PAGE_SIZE = 10;

/**
 * エピソード詳細ページの感想セクション（Server Component）。
 *
 * 評価/感想分離（podlog-workspace#59）の P-8 で追加。`RatingSectionWithAuth`
 * （P-6 の評価セクション）と同じパターンで、Server で並列取得した「感想一覧」と
 * 「閲覧者の認証状態」を Client Component に props として渡す。
 *
 * 認証状態は `getViewer()` で解決する:
 *  - `authenticated` → 投稿フォームを表示（自分の感想は MyCommentCard で編集・削除可）
 *  - `guest` / `no_profile` → CTA（ログインしてね）を表示、リストは閲覧可能
 *
 * `getViewer` の失敗は guest にフォールバック（公開ページのため、認証取得だけ
 * 失敗してもページ全体を error.tsx に倒さない）。
 *
 * `getEpisodeComments` は `revalidate: 0`（キャッシュなし、感想は頻繁に変わる）。
 * 取得失敗は呼び出し側（page.tsx の ErrorBoundary）に投げて握りつぶさない。
 */
export default async function EpisodeCommentSection({
  episodeId,
}: {
  episodeId: string;
}) {
  const [initialData, viewer] = await Promise.all([
    getEpisodeComments(episodeId, PAGE_SIZE, 0),
    getViewer().catch<Viewer>((err) => {
      console.error(
        "[EpisodeCommentSection] getViewer failed, falling back to guest:",
        err,
      );
      return { status: "guest" };
    }),
  ]);

  return (
    <EpisodeCommentSectionClient
      episodeId={episodeId}
      initialComments={initialData.comments}
      initialTotal={initialData.total}
      viewer={viewer}
    />
  );
}
