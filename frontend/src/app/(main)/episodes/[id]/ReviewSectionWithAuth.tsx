import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import EpisodeReviewSection from "@/components/review/EpisodeReviewSection";
import type { ReviewListResult, MyReviewResult } from "@/types/review";

/**
 * レビューセクション。認証依存データ（自分のレビュー）を Server で取得する。
 * API の成否で認証状態を判定する（401: 未ログイン、404: 未投稿、200: レビューあり）。
 * Suspense 境界の中で使う async Server Component。
 */
export default async function ReviewSectionWithAuth({
  episodeId,
  reviewsData,
}: {
  episodeId: string;
  reviewsData: ReviewListResult;
}) {
  let myReview: MyReviewResult | null = null;
  let isLoggedIn = false;

  try {
    myReview = await serverGet<MyReviewResult>(
      `/episodes/${encodeURIComponent(episodeId)}/reviews/mine`,
    );
    isLoggedIn = true;
  } catch (err) {
    if (err instanceof ApiRequestError) {
      if (err.status === 404) {
        // 認証OK、レビュー未投稿
        isLoggedIn = true;
        myReview = null;
      } else if (err.status === 401) {
        // 未ログイン → isLoggedIn = false のまま
      } else {
        // 500 系エラーは ErrorBoundary に委譲
        throw err;
      }
    } else {
      // ネットワークエラー等は ErrorBoundary に委譲
      throw err;
    }
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
