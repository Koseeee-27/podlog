import { serverGet } from "@/lib/api/server";
import DiscoverClient from "./DiscoverClient";
import type { PodcastSearchResult, PodcastSearchItem } from "@/types/podcast";
import type { GenreListResponse } from "@/types/genre";

interface DiscoverPageProps {
  searchParams: Promise<{ q?: string | string[]; genre?: string | string[] }>;
}

const GENRE_PAGE_SIZE = 20;

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] ?? "" : params.q ?? "";
  const genre = Array.isArray(params.genre) ? params.genre[0] ?? "" : params.genre ?? "";

  let genres: GenreListResponse["genres"] = [];
  let popularPodcasts: PodcastSearchItem[] = [];
  let initialResults: PodcastSearchItem[] = [];
  let initialGenrePodcasts: PodcastSearchItem[] = [];
  let initialGenreTotal = 0;
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
    // ジャンル一覧は常に取得（ジャンル選択中も「戻る」先で使う）
    // 人気番組はジャンル未選択時のみ取得
    // ジャンル選択時はジャンル別番組の初回データも取得
    const fetches: Promise<unknown>[] = [
      serverGet<GenreListResponse>("/genres", { noAuth: true, revalidate: 300 }),
    ];

    if (genre) {
      const genreParams = new URLSearchParams({
        genre,
        limit: String(GENRE_PAGE_SIZE),
        offset: "0",
      });
      fetches.push(
        serverGet<PodcastSearchResult>(
          `/podcasts/search?${genreParams.toString()}`,
          { noAuth: true, revalidate: 60 },
        ),
      );
    } else {
      fetches.push(
        serverGet<PodcastSearchResult>("/podcasts/popular?limit=6", { noAuth: true, revalidate: 300 }),
      );
    }

    const [genresResult, secondResult] = await Promise.allSettled(fetches);

    if (genresResult.status === "fulfilled") {
      genres = (genresResult.value as GenreListResponse).genres;
    } else {
      genresError = true;
    }

    if (secondResult.status === "fulfilled") {
      const data = secondResult.value as PodcastSearchResult;
      if (genre) {
        initialGenrePodcasts = data.podcasts;
        initialGenreTotal = data.total;
      } else {
        popularPodcasts = data.podcasts;
      }
    } else if (!genre) {
      popularError = true;
    }
  }

  return (
    <DiscoverClient
      key={`${query}-${genre}`}
      initialQuery={query}
      initialGenre={genre || null}
      initialResults={initialResults}
      initialGenres={genres}
      initialPopularPodcasts={popularPodcasts}
      initialGenrePodcasts={initialGenrePodcasts}
      initialGenreTotal={initialGenreTotal}
      genresError={genresError}
      popularError={popularError}
    />
  );
}
