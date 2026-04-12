import { serverGet } from "@/lib/api/server";
import PodcastCard from "@/components/podcast/PodcastCard";
import GenreGrid from "@/components/discover/GenreGrid";
import type { PodcastSearchResult } from "@/types/podcast";
import type { GenreListResponse } from "@/types/genre";

/**
 * 探すページのデフォルト表示（ジャンル一覧 + 人気の番組）。
 * 両セクションは独立しており、片方の失敗がもう片方に影響しないよう
 * Promise.allSettled で並列取得し、失敗したセクションのみ非表示にする。
 * 両方失敗した場合は throw して ErrorBoundary に委譲する。
 */
export default async function DefaultSection() {
  const [genresSettled, popularSettled] = await Promise.allSettled([
    serverGet<GenreListResponse>("/genres", { noAuth: true, revalidate: 300 }),
    serverGet<PodcastSearchResult>("/podcasts/popular?limit=6", {
      noAuth: true,
      revalidate: 300,
    }),
  ]);

  // 両方失敗した場合は ErrorBoundary に委譲
  if (genresSettled.status === "rejected" && popularSettled.status === "rejected") {
    throw genresSettled.reason;
  }

  // 失敗したセクションは非表示にする（空配列でフォールバックすると
  // 「データがない」と「API エラー」が区別できず誤った表示になるため）
  const genresFailed = genresSettled.status === "rejected";
  const popularFailed = popularSettled.status === "rejected";
  const genres = genresFailed ? [] : genresSettled.value.genres;
  const popularPodcasts = popularFailed ? [] : popularSettled.value.podcasts;

  return (
    <>
      {!genresFailed && (
        <section>
          <h2 className="text-lg font-bold text-stone-900 mb-4">
            ジャンルから探す
          </h2>
          <GenreGrid genres={genres} />
        </section>
      )}

      {!popularFailed && (
        <section className={genresFailed ? "" : "mt-8"}>
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
      )}
    </>
  );
}
