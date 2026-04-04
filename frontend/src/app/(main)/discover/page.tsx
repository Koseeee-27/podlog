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

  let genres: GenreListResponse["genres"] = [];
  let popularPodcasts: PodcastSearchResult["podcasts"] = [];
  let initialResults: PodcastSearchResult["podcasts"] = [];
  let genresError = false;
  let popularError = false;

  if (query) {
    // 検索時は検索結果のみ取得（ジャンル・人気番組は初期表示に不要）
    const searchResult = await serverGet<PodcastSearchResult>(
      `/podcasts/search?q=${encodeURIComponent(query)}`,
      { noAuth: true, revalidate: 0 },
    ).catch(() => null);

    initialResults = searchResult?.podcasts ?? [];
  } else {
    // 初期表示: ジャンル・人気番組を並列フェッチ
    const [genresResult, popularResult] = await Promise.allSettled([
      serverGet<GenreListResponse>("/genres", { noAuth: true, revalidate: 300 }),
      serverGet<PodcastSearchResult>("/podcasts/popular?limit=6", { noAuth: true, revalidate: 300 }),
    ]);

    if (genresResult.status === "fulfilled") {
      genres = genresResult.value.genres;
    } else {
      genresError = true;
    }

    if (popularResult.status === "fulfilled") {
      popularPodcasts = popularResult.value.podcasts;
    } else {
      popularError = true;
    }
  }

  return (
    <DiscoverClient
      key={query}
      initialQuery={query}
      initialResults={initialResults}
      initialGenres={genres}
      initialPopularPodcasts={popularPodcasts}
      genresError={genresError}
      popularError={popularError}
    />
  );
}
