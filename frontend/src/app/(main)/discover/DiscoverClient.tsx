"use client";

import { usePodcastSearch, usePopularPodcasts } from "@/hooks/usePodcastSearch";
import SearchBar from "@/components/podcast/SearchBar";
import PodcastCard from "@/components/podcast/PodcastCard";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";

interface DiscoverClientProps {
  initialQuery: string;
}

export default function DiscoverClient({ initialQuery }: DiscoverClientProps) {
  const { query, setQuery, results, loading: searchLoading, error: searchError } = usePodcastSearch(initialQuery);
  const isSearching = query.trim().length > 0;
  const { podcasts: popular, loading: popularLoading, error: popularError } = usePopularPodcasts(!isSearching);

  return (
    <div>
      <h1 className="sr-only">探す</h1>

      <SearchBar value={query} onChange={setQuery} loading={searchLoading} />

      <div className="mt-6">
        {isSearching ? (
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
        ) : (
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
