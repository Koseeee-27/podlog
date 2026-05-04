import { getEpisodeRating, getMyRating } from "@/lib/data/ratings";
import { ApiRequestError } from "@/types/api";
import EpisodeRatingSection from "@/components/rating/EpisodeRatingSection";
import type { MyRatingResult } from "@/types/rating";

/**
 * 自分の評価取得結果の判別 union。成功時は `{ kind: "ok", rating }`、
 * 認証関連エラーは `{ kind: "auth-error", status }` を返す。
 *
 * 旧 `ReviewSectionWithAuth` の `MyReviewFetchResult` と同じ意図 (`MyRatingResult`
 * に将来 `status` 等が増えても判別条件が壊れないよう専用タグで分岐) で揃えている。
 */
type MyRatingFetchResult =
  | { kind: "ok"; rating: MyRatingResult }
  | { kind: "auth-error"; status: 401 | 404 };

/**
 * 評価セクション（評価/感想分離後の P-6 で `ReviewSectionWithAuth` を置き換える）。
 *
 * エピソードの評価集計と「自分の評価」を Server で並列取得し、`EpisodeRatingSection`
 * (Client Component) に props として渡す。
 *
 * 自分の評価の取得は API の成否で認証状態を判定する:
 *  - 200 → `{ kind: "ok", rating }`（ログイン済み・評価投稿済み）
 *  - 401 → `{ kind: "auth-error", status: 401 }`（未ログイン）
 *  - 404 → `{ kind: "auth-error", status: 404 }`（ログイン済み・未投稿）
 *  - それ以外 → throw して ErrorBoundary に委譲
 *
 * 集計（`getEpisodeRating`）の取得失敗は ErrorBoundary に委譲する（握りつぶさない）。
 *
 * 旧 `ReviewSectionWithAuth.tsx` は P-9（podlog#396 系）で削除予定。本 PR では参照を
 * 切るのみで残しておき、感想セクション（podlog#391 系の P-8）の実装で再利用可能な
 * 構造（並列取得 + 認証分岐）を参考にできるようにしている。
 */
export default async function RatingSectionWithAuth({
  episodeId,
}: {
  episodeId: string;
}) {
  const [episodeStats, myRatingResult] = await Promise.all([
    getEpisodeRating(episodeId),
    getMyRating(episodeId)
      .then<MyRatingFetchResult>((rating) => ({ kind: "ok", rating }))
      .catch<MyRatingFetchResult>((err) => {
        if (
          err instanceof ApiRequestError &&
          (err.status === 401 || err.status === 404)
        ) {
          return { kind: "auth-error", status: err.status };
        }
        throw err;
      }),
  ]);

  const myRating = myRatingResult.kind === "ok" ? myRatingResult.rating : null;
  const isLoggedIn =
    myRatingResult.kind === "ok" || myRatingResult.status === 404;

  return (
    <EpisodeRatingSection
      episodeId={episodeId}
      episodeStats={episodeStats}
      myRating={myRating}
      isLoggedIn={isLoggedIn}
    />
  );
}
