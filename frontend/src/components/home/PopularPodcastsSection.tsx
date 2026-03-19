import PodcastCard from "@/components/podcast/PodcastCard";
import Link from "next/link";
import { serverGet } from "@/lib/api/server";
import type { PodcastSearchItem, PodcastSearchResult } from "@/types/podcast";

const DISPLAY_COUNT = 6;

export default async function PopularPodcastsSection() {
  let podcasts: PodcastSearchItem[] = [];
  try {
    const result = await serverGet<PodcastSearchResult>(
      `/podcasts/popular?limit=${DISPLAY_COUNT}`,
      { revalidate: 300, tags: ["popular-podcasts"], noAuth: true }
    );
    podcasts = result.podcasts;
  } catch (error) {
    console.error(
      "PopularPodcastsSection: 人気番組の取得に失敗しました",
      error
    );
    return null;
  }

  if (podcasts.length === 0) {
    return null;
  }

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">人気の番組</h2>
        <Link
          href="/discover"
          className="text-sm text-rose-500 hover:text-rose-600 font-medium"
        >
          もっと見る
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {podcasts.map((podcast) => (
          <PodcastCard key={podcast.id} podcast={podcast} />
        ))}
      </div>
    </section>
  );
}
