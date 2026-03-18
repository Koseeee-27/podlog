"use client";

import { usePopularPodcasts } from "@/hooks/usePodcastSearch";
import PodcastCard from "@/components/podcast/PodcastCard";
import Link from "next/link";

export default function PopularPodcastsSection() {
  const { podcasts, loading, error } = usePopularPodcasts(true);

  // データがない場合やエラー時はセクションごと非表示
  if (error || (!loading && podcasts.length === 0)) {
    return null;
  }

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">
          人気の番組
        </h2>
        <Link
          href="/discover"
          className="text-sm text-rose-500 hover:text-rose-600 font-medium"
        >
          もっと見る
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-stone-200 bg-white p-4 animate-pulse"
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-lg bg-stone-100 flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-stone-100 rounded w-3/4" />
                  <div className="h-3 bg-stone-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {podcasts.slice(0, 6).map((podcast) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
          ))}
        </div>
      )}
    </section>
  );
}
