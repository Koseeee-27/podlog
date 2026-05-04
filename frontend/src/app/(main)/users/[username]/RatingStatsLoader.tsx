"use client";

import { use } from "react";
import UserRatingStats from "@/components/rating/UserRatingStats";
import type { UserRatingsStatsResult } from "@/types/rating";

/**
 * `use()` で `getUserRatingsStats` の Promise を解決し、`UserRatingStats` に渡す
 * 薄いローダー。
 *
 * Suspense + ErrorBoundary は親（`PublicProfileClient`）側で wrap している。
 * 旧 `ReviewListLoader.tsx` と異なり、評価サマリーは「もっと見る」ページネーション
 * を持たないため、`useState` / `useTransition` 等の追加 state は不要。
 *
 * 旧 `ReviewListLoader.tsx` は P-9（podlog#396 系）で削除予定（本 PR では参照を
 * 切るのみで残置）。
 */
export default function RatingStatsLoader({
  promise,
}: {
  promise: Promise<UserRatingsStatsResult>;
}) {
  const data = use(promise);
  return (
    <UserRatingStats
      totalRatings={data.total_ratings}
      averageRating={data.average_rating}
    />
  );
}
