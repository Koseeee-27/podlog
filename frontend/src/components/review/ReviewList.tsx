"use client";

import { useEpisodeReviews } from "@/hooks/useReviews";
import ReviewListView from "./ReviewListView";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";

interface ReviewListProps {
  episodeId: string;
}

export default function ReviewList({ episodeId }: ReviewListProps) {
  const { reviews, total, averageRating, loading, error, hasMore, loadMore } =
    useEpisodeReviews(episodeId);

  if (loading && reviews.length === 0) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <ReviewListView
      reviews={reviews}
      total={total}
      averageRating={averageRating}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={loadMore}
    />
  );
}
