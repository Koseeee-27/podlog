import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import EpisodeReviewSection from "@/components/review/EpisodeReviewSection";
import { REVIEW_PAGE_SIZE } from "@/lib/constants";
import type { ReviewListResult, MyReviewResult } from "@/types/review";

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
  const encodedId = encodeURIComponent(episodeId);

  // レビュー一覧と自分のレビューを並列取得
  const [reviewsData, myReviewResult] = await Promise.all([
    serverGet<ReviewListResult>(
      `/episodes/${encodedId}/reviews?limit=${REVIEW_PAGE_SIZE}&offset=0`,
      { noAuth: true, revalidate: 0 },
    ),
    serverGet<MyReviewResult>(
      `/episodes/${encodedId}/reviews/mine`,
    ).catch((err) => {
      // 認証関連のエラーは正常系として扱う
      // 401: 未ログイン、404: 未投稿 → null を返して後段で判定
      // 500 系やネットワークエラーは throw して ErrorBoundary に委譲
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 404)) {
        return { status: err.status } as const;
      }
      throw err;
    }),
  ]);

  // myReviewResult の形で認証状態を判定
  let myReview: MyReviewResult | null = null;
  let isLoggedIn = false;
  if ("status" in myReviewResult) {
    // 401: 未ログイン、404: ログイン済みだが未投稿
    isLoggedIn = myReviewResult.status === 404;
  } else {
    // レビュー取得成功 → ログイン済み
    myReview = myReviewResult;
    isLoggedIn = true;
  }

  return (
    <EpisodeReviewSection
      episodeId={episodeId}
      initialReviews={reviewsData}
      initialMyReview={myReview}
      isLoggedIn={isLoggedIn}
    />
  );
}
