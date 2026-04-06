"use client";

import { useState, useTransition } from "react";
import { apiGet } from "@/lib/api/client";
import ErrorMessage from "@/components/ui/ErrorMessage";
import type { PodcastRatingResult } from "@/types/review";

interface RatingDisplayProps {
  podcastId: string;
  averageRating?: number;
  totalReviews?: number;
  fetchFailed?: boolean;
}

export default function RatingDisplay({
  podcastId,
  averageRating: initialRating,
  totalReviews: initialReviews,
  fetchFailed = false,
}: RatingDisplayProps) {
  const [averageRating, setAverageRating] = useState(initialRating);
  const [totalReviews, setTotalReviews] = useState(initialReviews);
  const [error, setError] = useState(fetchFailed);
  const [isRetrying, startRetry] = useTransition();

  function handleRetry() {
    startRetry(async () => {
      try {
        const result = await apiGet<PodcastRatingResult>(
          `/podcasts/${encodeURIComponent(podcastId)}/rating`,
        );
        setAverageRating(result.average_rating);
        setTotalReviews(result.total_reviews);
        setError(false);
      } catch {
        setError(true);
      }
    });
  }

  if (error) {
    return isRetrying ? (
      <span className="text-xs text-stone-400">読み込み中...</span>
    ) : (
      <ErrorMessage
        message="評価の取得に失敗しました"
        onRetry={handleRetry}
      />
    );
  }

  if (totalReviews === undefined || totalReviews === 0 || averageRating === undefined) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="text-base font-semibold text-stone-900">
          {averageRating.toFixed(1)}
        </span>
      </div>
      <span className="text-sm text-stone-500">
        ({totalReviews}件のレビュー)
      </span>
    </div>
  );
}
