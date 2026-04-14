import { getReviewsByEpisodeId, getMyReview } from "@/lib/data/reviews";
import { ApiRequestError } from "@/types/api";
import EpisodeReviewSection from "@/components/review/EpisodeReviewSection";
import { REVIEW_PAGE_SIZE } from "@/lib/constants";
import type { MyReviewResult } from "@/types/review";

/**
 * 自分のレビュー取得結果の判別 union。
 * 成功時は `{ kind: "ok", review }`、認証関連エラーは `{ kind: "auth-error", status }` を返す。
 * `MyReviewResult`（= Review 型）に将来 `status` 等のフィールドが追加されても
 * 判別条件が壊れないよう、専用のタグ（`kind`）で分岐する。
 */
type MyReviewFetchResult =
  | { kind: "ok"; review: MyReviewResult }
  | { kind: "auth-error"; status: 401 | 404 };

/**
 * レビューセクション。
 * レビュー一覧と、認証依存データ（自分のレビュー）を Server で並列取得する。
 *
 * レビュー一覧の取得失敗は ErrorBoundary に委譲する（ここで握りつぶさない）。
 * 自分のレビューは API の成否で認証状態を判定する
 * （401: 未ログイン、404: 未投稿、200: レビューあり）。
 *
 * Suspense 境界の中で使う async Server Component。
 */
export default async function ReviewSectionWithAuth({
  episodeId,
}: {
  episodeId: string;
}) {
  // レビュー一覧と自分のレビューを並列取得
  const [reviewsData, myReviewResult] = await Promise.all([
    getReviewsByEpisodeId(episodeId, REVIEW_PAGE_SIZE, 0),
    getMyReview(episodeId)
      .then<MyReviewFetchResult>((review) => ({ kind: "ok", review }))
      .catch<MyReviewFetchResult>((err) => {
        // 認証関連のエラーは正常系として扱う
        // 401: 未ログイン、404: 未投稿 → タグ付きで後段に返す
        // 500 系やネットワークエラーは throw して ErrorBoundary に委譲
        if (
          err instanceof ApiRequestError &&
          (err.status === 401 || err.status === 404)
        ) {
          return { kind: "auth-error", status: err.status };
        }
        throw err;
      }),
  ]);

  // 認証状態を判定
  // - ok:          レビュー取得成功 → ログイン済み・投稿済み
  // - auth-error(404): ログイン済みだが未投稿
  // - auth-error(401): 未ログイン
  const myReview = myReviewResult.kind === "ok" ? myReviewResult.review : null;
  const isLoggedIn =
    myReviewResult.kind === "ok" || myReviewResult.status === 404;

  return (
    <EpisodeReviewSection
      episodeId={episodeId}
      initialReviews={reviewsData}
      initialMyReview={myReview}
      isLoggedIn={isLoggedIn}
    />
  );
}
