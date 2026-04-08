"use client";

import { useState, useTransition } from "react";
import PodcastCard from "@/components/podcast/PodcastCard";
import { getPodcastsByGenre } from "@/lib/api/podcasts";
import type { PodcastSearchItem } from "@/types/podcast";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

const PAGE_SIZE = 20;

interface GenrePodcastsLoadMoreProps {
  genre: string;
  initialCount: number;
  total: number;
}

export default function GenrePodcastsLoadMore({
  genre,
  initialCount,
  total,
}: GenrePodcastsLoadMoreProps) {
  const [additional, setAdditional] = useState<PodcastSearchItem[]>([]);
  const [isLoadingMore, startLoadMore] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const loadedCount = initialCount + additional.length;
  const hasMore = loadedCount < total;

  const loadMore = () => {
    startLoadMore(async () => {
      try {
        setError(null);
        const result = await getPodcastsByGenre(genre, {
          limit: PAGE_SIZE,
          offset: loadedCount,
        });
        setAdditional((prev) => [...prev, ...result.podcasts]);
      } catch (err) {
        setError(
          getUserFriendlyErrorMessage(err, "追加読み込みに失敗しました"),
        );
      }
    });
  };

  return (
    <>
      {additional.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {additional.map((podcast) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
      )}

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-full hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingMore ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </>
  );
}
