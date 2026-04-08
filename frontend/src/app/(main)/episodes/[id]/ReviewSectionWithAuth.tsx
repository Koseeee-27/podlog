import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import EpisodeReviewSection from "@/components/review/EpisodeReviewSection";
import { checkLoggedIn } from "./check-logged-in";
import type { ReviewListResult, MyReviewResult } from "@/types/review";

/**
 * レビューセクション。認証依存データ（自分のレビュー）を Server で取得する。
 * Suspense 境界の中で使う async Server Component。
 */
export default async function ReviewSectionWithAuth({
  episodeId,
  reviewsData,
}: {
  episodeId: string;
  reviewsData: ReviewListResult;
}) {
  const isLoggedIn = await checkLoggedIn();

  let myReview: MyReviewResult | null = null;
  if (isLoggedIn) {
    try {
      myReview = await serverGet<MyReviewResult>(
        `/episodes/${encodeURIComponent(episodeId)}/reviews/mine`,
      );
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        myReview = null;
      } else {
        console.warn("[ReviewSectionWithAuth] 自分のレビュー取得に失敗:", err);
      }
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
