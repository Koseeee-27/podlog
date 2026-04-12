import { serverGet } from "@/lib/api/server";
import RatingDisplay from "./RatingDisplay";
import type { PodcastRatingResult } from "@/types/review";

interface RatingSectionProps {
  podcastId: string;
}

/**
 * 評価データの Server Component。
 * 評価を取得し、RatingDisplay に渡す。
 * 取得失敗時は throw して ErrorBoundary に委譲する。
 */
export default async function RatingSection({ podcastId }: RatingSectionProps) {
  const result = await serverGet<PodcastRatingResult>(
    `/podcasts/${encodeURIComponent(podcastId)}/rating`,
    { noAuth: true, revalidate: 60 },
  );

  return (
    <RatingDisplay
      averageRating={result.average_rating}
      totalReviews={result.total_reviews}
    />
  );
}
