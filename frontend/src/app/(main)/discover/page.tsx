import { serverGet } from "@/lib/api/server";
import DiscoverSearchBar from "./DiscoverSearchBar";
import SearchResultsSection from "./SearchResultsSection";
import GenrePodcastsSection from "./GenrePodcastsSection";
import DefaultSection from "./DefaultSection";
import type { PodcastSearchResult, PodcastSearchItem } from "@/types/podcast";
import type { GenreListResponse } from "@/types/genre";

interface DiscoverPageProps {
  searchParams: Promise<{ q?: string | string[]; genre?: string | string[] }>;
}

const GENRE_PAGE_SIZE = 20;

export default async function DiscoverPage({
  searchParams,
}: DiscoverPageProps) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  const genre = Array.isArray(params.genre)
    ? (params.genre[0] ?? "")
    : (params.genre ?? "");

  return (
    <div>
      <h1 className="sr-only">探す</h1>

      <DiscoverSearchBar initialQuery={query} />

      <div className="mt-6">
        {query ? (
          <SearchResults query={query} />
        ) : genre ? (
          <GenrePodcastsView genre={genre} />
        ) : (
          <DefaultView />
        )}
      </div>
    </div>
  );
}

/** 検索結果を取得して表示 */
async function SearchResults({ query }: { query: string }) {
  const result = await serverGet<PodcastSearchResult>(
    `/podcasts/search?q=${encodeURIComponent(query)}`,
    { noAuth: true, revalidate: 0 },
  ).catch(() => null);

  return (
    <SearchResultsSection
      query={query}
      results={result?.podcasts ?? []}
    />
  );
}

/** ジャンル別番組を取得して表示 */
async function GenrePodcastsView({ genre }: { genre: string }) {
  const genreParams = new URLSearchParams({
    genre,
    limit: String(GENRE_PAGE_SIZE),
    offset: "0",
  });

  const [genresResult, podcastsResult] = await Promise.allSettled([
    serverGet<GenreListResponse>("/genres", { noAuth: true, revalidate: 300 }),
    serverGet<PodcastSearchResult>(
      `/podcasts/search?${genreParams.toString()}`,
      { noAuth: true, revalidate: 60 },
    ),
  ]);

  const genres =
    genresResult.status === "fulfilled" ? genresResult.value.genres : [];
  const genreName = genres.find((g) => g.id === genre)?.name_ja;

  const podcasts: PodcastSearchItem[] =
    podcastsResult.status === "fulfilled"
      ? podcastsResult.value.podcasts
      : [];
  const total =
    podcastsResult.status === "fulfilled" ? podcastsResult.value.total : 0;
  const podcastsError = podcastsResult.status === "rejected";

  return (
    <GenrePodcastsSection
      genre={genre}
      genreName={genreName}
      podcasts={podcasts}
      total={total}
      error={podcastsError}
    />
  );
}

/** 初期表示（ジャンルグリッド + 人気番組） */
async function DefaultView() {
  const [genresResult, popularResult] = await Promise.allSettled([
    serverGet<GenreListResponse>("/genres", { noAuth: true, revalidate: 300 }),
    serverGet<PodcastSearchResult>("/podcasts/popular?limit=6", {
      noAuth: true,
      revalidate: 300,
    }),
  ]);

  return (
    <DefaultSection
      genres={
        genresResult.status === "fulfilled" ? genresResult.value.genres : []
      }
      genresError={genresResult.status === "rejected"}
      popularPodcasts={
        popularResult.status === "fulfilled"
          ? popularResult.value.podcasts
          : []
      }
      popularError={popularResult.status === "rejected"}
    />
  );
}
