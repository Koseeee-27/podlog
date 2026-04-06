import { serverGet } from "@/lib/api/server";
import RatingDisplay from "./RatingDisplay";
import type { PodcastRatingResult } from "@/types/review";

interface RatingSectionProps {
  podcastId: string;
}

/**
 * 評価データの Server Component。
 * 評価を取得し、RatingDisplay に渡す。
 * 取得失敗時は fetchFailed を渡してリトライ可能にする。
 */
export default async function RatingSection({ podcastId }: RatingSectionProps) {
  const result = await serverGet<PodcastRatingResult>(
    `/podcasts/${encodeURIComponent(podcastId)}/rating`,
    { noAuth: true, revalidate: 60 },
  ).catch(() => null);

  if (!result) {
    return <RatingDisplay podcastId={podcastId} fetchFailed />;
  }

  return (
    <RatingDisplay
      podcastId={podcastId}
      averageRating={result.average_rating}
      totalReviews={result.total_reviews}
    />
  );
}
