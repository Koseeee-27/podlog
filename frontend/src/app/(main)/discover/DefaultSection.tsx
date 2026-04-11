import { serverGet } from "@/lib/api/server";
import PodcastCard from "@/components/podcast/PodcastCard";
import GenreGrid from "@/components/discover/GenreGrid";
import type { PodcastSearchResult } from "@/types/podcast";
import type { GenreListResponse } from "@/types/genre";

/**
 * 探すページのデフォルト表示（ジャンル一覧 + 人気の番組）。
 * 取得失敗時は throw して ErrorBoundary に委譲する。
 */
export default async function DefaultSection() {
  const [genresResult, popularResult] = await Promise.all([
    serverGet<GenreListResponse>("/genres", { noAuth: true, revalidate: 300 }),
    serverGet<PodcastSearchResult>("/podcasts/popular?limit=6", {
      noAuth: true,
      revalidate: 300,
    }),
  ]);

  const genres = genresResult.genres;
  const popularPodcasts = popularResult.podcasts;

  return (
    <>
      <section>
        <h2 className="text-lg font-bold text-stone-900 mb-4">
          ジャンルから探す
        </h2>
        <GenreGrid genres={genres} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-stone-900 mb-4">人気の番組</h2>

        {popularPodcasts.length === 0 ? (
          <p className="text-sm text-stone-500">
            まだレビューのある番組がありません
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularPodcasts.map((podcast) => (
              <PodcastCard key={podcast.id} podcast={podcast} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
