import Link from "next/link";
import { serverGet } from "@/lib/api/server";
import PodcastCard from "@/components/podcast/PodcastCard";
import GenrePodcastsLoadMore from "@/components/discover/GenrePodcastsLoadMore";
import EmptyState from "@/components/ui/EmptyState";
import { MicrophoneIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { PodcastSearchResult } from "@/types/podcast";
import type { GenreListResponse } from "@/types/genre";

const PAGE_SIZE = 20;

interface GenrePodcastsSectionProps {
  genre: string;
}

/**
 * ジャンル別番組一覧セクション。
 * 取得失敗時は throw して ErrorBoundary に委譲する。
 */
export default async function GenrePodcastsSection({
  genre,
}: GenrePodcastsSectionProps) {
  const genreParams = new URLSearchParams({
    genre,
    limit: String(PAGE_SIZE),
    offset: "0",
  });

  const [genresResult, podcastsResult] = await Promise.all([
    serverGet<GenreListResponse>("/genres", { noAuth: true, revalidate: 300 }),
    serverGet<PodcastSearchResult>(
      `/podcasts/search?${genreParams.toString()}`,
      { noAuth: true, revalidate: 60 },
    ),
  ]);

  const genres = genresResult.genres;
  const genreName = genres.find((g) => g.id === genre)?.name_ja;
  const podcasts = podcastsResult.podcasts;
  const total = podcastsResult.total;

  return (
    <>
      <Link
        href="/discover"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 transition-colors mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        ジャンル一覧に戻る
      </Link>

      <h2 className="text-lg font-bold text-stone-900 mb-4">
        {genreName ?? genre}の番組
      </h2>

      {podcasts.length === 0 ? (
        <EmptyState
          icon={<MicrophoneIcon className="h-12 w-12" />}
          message="このジャンルの番組はまだありません"
          description="他のジャンルを探してみましょう"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {podcasts.map((podcast) => (
              <PodcastCard key={podcast.id} podcast={podcast} />
            ))}
          </div>

          <GenrePodcastsLoadMore
            genre={genre}
            initialCount={podcasts.length}
            total={total}
          />
        </>
      )}
    </>
  );
}
