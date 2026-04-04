import { serverGet } from "@/lib/api/server";
import DiscoverClient from "./DiscoverClient";
import type { PodcastSearchResult } from "@/types/podcast";
import type { GenreListResponse } from "@/types/genre";

interface DiscoverPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] ?? "" : q ?? "";

  // ジャンル・人気番組・検索結果を並列でサーバーサイドフェッチ
  const [genresResult, popularResult, searchResult] = await Promise.allSettled([
    serverGet<GenreListResponse>("/genres", { noAuth: true, revalidate: 300 }),
    serverGet<PodcastSearchResult>("/podcasts/popular?limit=6", { noAuth: true, revalidate: 300 }),
    query
      ? serverGet<PodcastSearchResult>(
          `/podcasts/search?q=${encodeURIComponent(query)}`,
          { noAuth: true, revalidate: 0 },
        )
      : Promise.resolve(null),
  ]);

  const genres = genresResult.status === "fulfilled" ? genresResult.value.genres : [];
  const popularPodcasts = popularResult.status === "fulfilled" ? popularResult.value.podcasts : [];
  const initialResults = searchResult.status === "fulfilled" && searchResult.value
    ? searchResult.value.podcasts
    : [];

  return (
    <DiscoverClient
      key={query}
      initialQuery={query}
      initialResults={initialResults}
      initialGenres={genres}
      initialPopularPodcasts={popularPodcasts}
    />
  );
}
