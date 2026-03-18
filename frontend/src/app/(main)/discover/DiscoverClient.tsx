"use client";

import { useState } from "react";
import { usePodcastSearch, usePopularPodcasts, useGenrePodcasts } from "@/hooks/usePodcastSearch";
import { useGenres } from "@/hooks/useGenres";
import SearchBar from "@/components/podcast/SearchBar";
import PodcastCard from "@/components/podcast/PodcastCard";
import GenreChips from "@/components/discover/GenreChips";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";

interface DiscoverClientProps {
  initialQuery: string;
}

export default function DiscoverClient({ initialQuery }: DiscoverClientProps) {
  const { query, setQuery, results, loading: searchLoading, error: searchError } = usePodcastSearch(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { genres, loading: genresLoading } = useGenres();

  const isSearching = query.trim().length > 0;

  // ジャンルが選択されていて、かつ検索中でない場合のみジャンル番組を取得
  const activeGenre = !isSearching ? selectedGenre : null;
  const { podcasts: genrePodcasts, loading: genreLoading, error: genreError } = useGenrePodcasts(activeGenre);

  // 人気番組は、検索中でもジャンル選択中でもない場合のみ取得
  const showPopular = !isSearching && selectedGenre === null;
  const { podcasts: popular, loading: popularLoading, error: popularError } = usePopularPodcasts(showPopular);

  // 検索開始時はジャンル選択をリセットしない（チップを非アクティブに見せるだけ）
  // 検索クリア時にジャンル選択が復帰する

  const handleGenreSelect = (genreId: string | null) => {
    setSelectedGenre(genreId);
    // ジャンル選択時に検索をクリア
    if (query.trim()) {
      setQuery("");
    }
  };

  // 選択中のジャンルの日本語名を取得
  const selectedGenreName = genres.find((g) => g.id === selectedGenre)?.name_ja;

  return (
    <div>
      <h1 className="sr-only">探す</h1>

      <SearchBar value={query} onChange={setQuery} loading={searchLoading} />

      {/* ジャンルチップ: 検索中は非アクティブ表示 */}
      <div className="mt-4">
        <GenreChips
          genres={genres}
          selectedGenre={isSearching ? null : selectedGenre}
          onSelect={handleGenreSelect}
          loading={genresLoading}
        />
      </div>

      <div className="mt-6">
        {isSearching ? (
          /* --- 検索中 --- */
          <>
            {searchError && <ErrorMessage message={searchError} />}

            {!searchLoading && results.length === 0 && !searchError && (
              <p className="text-center py-12 text-stone-500">
                &ldquo;{query}&rdquo; に一致するポッドキャストが見つかりませんでした
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((podcast) => (
                <PodcastCard key={podcast.id} podcast={podcast} />
              ))}
            </div>
          </>
        ) : selectedGenre !== null ? (
          /* --- ジャンル選択中 --- */
          <>
            <h2 className="text-lg font-bold text-stone-900 mb-4">
              {selectedGenreName ?? selectedGenre}の番組
            </h2>

            {genreLoading && <Loading />}
            {genreError && <ErrorMessage message={genreError} />}

            {!genreLoading && genrePodcasts.length === 0 && !genreError && (
              <p className="text-sm text-stone-500">
                このジャンルの番組はまだありません
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {genrePodcasts.map((podcast) => (
                <PodcastCard key={podcast.id} podcast={podcast} />
              ))}
            </div>
          </>
        ) : (
          /* --- 初期表示: 人気番組 --- */
          <>
            <h2 className="text-lg font-bold text-stone-900 mb-4">人気の番組</h2>

            {popularLoading && <Loading />}
            {popularError && <ErrorMessage message={popularError} />}

            {!popularLoading && popular.length === 0 && !popularError && (
              <p className="text-sm text-stone-500">まだレビューのある番組がありません</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {popular.map((podcast) => (
                <PodcastCard key={podcast.id} podcast={podcast} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
