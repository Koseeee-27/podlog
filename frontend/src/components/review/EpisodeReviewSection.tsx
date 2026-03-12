"use client";

import { useState } from "react";
import { useReviewActions, useEpisodeReviews } from "@/hooks/useReviews";
import EpisodeReviewSectionView from "./EpisodeReviewSectionView";

interface EpisodeReviewSectionProps {
  episodeId: string;
  isLoggedIn: boolean;
}

export default function EpisodeReviewSection({ episodeId, isLoggedIn }: EpisodeReviewSectionProps) {
  const { reviews, total, averageRating, loading: listLoading, error: listError, hasMore, loadMore, refresh } =
    useEpisodeReviews(episodeId);
  const { create, loading: actionLoading, error: actionError } = useReviewActions(episodeId);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (rating: number, comment: string) => {
    const review = await create({
      rating,
      comment: comment || undefined,
    });
    if (review) {
      setSubmitted(true);
      refresh();
    }
  };

  return (
    <EpisodeReviewSectionView
      reviews={reviews}
      total={total}
      averageRating={averageRating}
      listLoading={listLoading}
      hasMore={hasMore}
      onLoadMore={loadMore}
      onSubmit={handleSubmit}
      actionLoading={actionLoading}
      actionError={actionError}
      listError={listError}
      submitted={submitted}
      isLoggedIn={isLoggedIn}
    />
  );
}
