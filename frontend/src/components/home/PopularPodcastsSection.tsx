import PodcastCard from "@/components/podcast/PodcastCard";
import Link from "next/link";
import { getPopularPodcasts } from "@/lib/data/podcasts";

const DISPLAY_COUNT = 6;

/**
 * 人気の番組セクション。
 * 取得失敗時は throw して ErrorBoundary に委譲する。
 */
export default async function PopularPodcastsSection() {
  const result = await getPopularPodcasts(DISPLAY_COUNT);
  const podcasts = result.podcasts;

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
