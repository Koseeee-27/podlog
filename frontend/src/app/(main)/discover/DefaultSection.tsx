import { serverGet } from "@/lib/api/server";
import PodcastCard from "@/components/podcast/PodcastCard";
import GenreGrid from "@/components/discover/GenreGrid";
import ErrorMessage from "@/components/ui/ErrorMessage";
import type { PodcastSearchResult } from "@/types/podcast";
import type { GenreListResponse } from "@/types/genre";

export default async function DefaultSection() {
  const [genresResult, popularResult] = await Promise.allSettled([
    serverGet<GenreListResponse>("/genres", { noAuth: true, revalidate: 300 }),
    serverGet<PodcastSearchResult>("/podcasts/popular?limit=6", {
      noAuth: true,
      revalidate: 300,
    }),
  ]);

  const genres =
    genresResult.status === "fulfilled" ? genresResult.value.genres : [];
  const genresError = genresResult.status === "rejected";

  const popularPodcasts =
    popularResult.status === "fulfilled"
      ? popularResult.value.podcasts
      : [];
  const popularError = popularResult.status === "rejected";

  return (
    <>
      <section>
        <h2 className="text-lg font-bold text-stone-900 mb-4">
          ジャンルから探す
        </h2>
        {genresError ? (
          <ErrorMessage message="ジャンルの取得に失敗しました" retryHref="/discover" />
        ) : (
          <GenreGrid genres={genres} />
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-stone-900 mb-4">人気の番組</h2>

        {popularError ? (
          <ErrorMessage message="人気の番組の取得に失敗しました" retryHref="/discover" />
        ) : popularPodcasts.length === 0 ? (
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
