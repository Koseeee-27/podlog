"use client";

import { useState, useEffect } from "react";
import { usePodcastSearch, usePopularPodcasts, useGenrePodcasts } from "@/hooks/usePodcastSearch";
import { useGenres } from "@/hooks/useGenres";
import { useAuth } from "@/hooks/useAuth";
import SearchBar from "@/components/podcast/SearchBar";
import PodcastCard from "@/components/podcast/PodcastCard";
import GenreGrid from "@/components/discover/GenreGrid";
import PodcastRequestDialog from "@/components/discover/PodcastRequestDialog";
import LoginPromptButton from "@/components/ui/LoginPromptButton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Loading from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";
import { MagnifyingGlassIcon, MicrophoneIcon, PlusCircleIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

interface DiscoverClientProps {
  initialQuery: string;
}

export default function DiscoverClient({ initialQuery }: DiscoverClientProps) {
  const { query, results, loading: searchLoading, error: searchError, search, clear } = usePodcastSearch();
  const [inputValue, setInputValue] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const { genres, loading: genresLoading, error: genresError } = useGenres();
  const auth = useAuth();

  // 初期クエリがあれば検索実行
  useEffect(() => {
    if (initialQuery.trim()) {
      search(initialQuery);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isSearching = query.trim().length > 0;

  const handleSearchSubmit = () => {
    if (inputValue.trim()) {
      search(inputValue);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (!value.trim()) {
      clear();
    }
  };

  // ジャンルが選択されていて、かつ検索中でない場合のみジャンル番組を取得
  const activeGenre = !isSearching ? selectedGenre : null;
  const {
    podcasts: genrePodcasts,
    loading: genreLoading,
    error: genreError,
    hasMore: genreHasMore,
    loadMore: genreLoadMore,
    isLoadingMore: genreIsLoadingMore,
  } = useGenrePodcasts(activeGenre);

  // 人気番組は、検索中でもジャンル選択中でもない場合のみ取得
  const showPopular = !isSearching && selectedGenre === null;
  const { podcasts: popular, loading: popularLoading, error: popularError } = usePopularPodcasts(showPopular, 6);

  const handleGenreSelect = (genreId: string) => {
    setSelectedGenre(genreId);
    // ジャンル選択時に検索をクリア
    if (inputValue.trim()) {
      setInputValue("");
      clear();
    }
  };

  const handleBackToGenres = () => {
    setSelectedGenre(null);
  };

  // 選択中のジャンルの日本語名を取得
  const selectedGenreName = genres.find((g) => g.id === selectedGenre)?.name_ja;

  return (
    <div>
      <h1 className="sr-only">探す</h1>

      <SearchBar value={inputValue} onChange={handleInputChange} onSubmit={handleSearchSubmit} loading={searchLoading} />

      <div className="mt-6">
        {isSearching ? (
          /* --- 検索中 --- */
          <>
            {searchError && <ErrorMessage message={searchError} />}

            {!searchLoading && results.length === 0 && !searchError && (
              <>
                <EmptyState
                  icon={<MagnifyingGlassIcon className="h-12 w-12" />}
                  message={`"${query}" に一致するポッドキャストが見つかりませんでした`}
                  description="別のキーワードで試してみてください"
                />

                {/* 番組追加リクエスト導線 */}
                <div className="mt-6 border border-stone-200 rounded-xl p-5 text-center">
                  <p className="text-sm font-medium text-stone-700">
                    お探しの番組が見つかりませんか？
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    番組の追加をリクエストできます
                  </p>
                  <div className="mt-4">
                    {auth.status === "authenticated" || auth.status === "no_profile" ? (
                      <button
                        type="button"
                        onClick={() => setRequestDialogOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
                      >
                        <PlusCircleIcon className="h-5 w-5" />
                        番組追加をリクエストする
                      </button>
                    ) : (
                      <LoginPromptButton label="ログインしてリクエストする" />
                    )}
                  </div>
                </div>
              </>
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
            <button
              type="button"
              onClick={handleBackToGenres}
              className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 transition-colors mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              ジャンル一覧に戻る
            </button>

            <h2 className="text-lg font-bold text-stone-900 mb-4">
              {selectedGenreName ?? selectedGenre}の番組
            </h2>

            {genreLoading && <Loading />}
            {genreError && <ErrorMessage message={genreError} />}

            {!genreLoading && genrePodcasts.length === 0 && !genreError && (
              <EmptyState
                icon={<MicrophoneIcon className="h-12 w-12" />}
                message="このジャンルの番組はまだありません"
                description="他のジャンルを探してみましょう"
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {genrePodcasts.map((podcast) => (
                <PodcastCard key={podcast.id} podcast={podcast} />
              ))}
            </div>

            {genreHasMore && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={genreLoadMore}
                  disabled={genreIsLoadingMore}
                  className="px-6 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-full hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {genreIsLoadingMore ? "読み込み中..." : "もっと見る"}
                </button>
              </div>
            )}
          </>
        ) : (
          /* --- 初期表示: ジャンルグリッド + 人気番組 --- */
          <>
            {/* ジャンルグリッド */}
            <section>
              <h2 className="text-lg font-bold text-stone-900 mb-4">ジャンルから探す</h2>
              {genresError && <ErrorMessage message={genresError} />}
              <GenreGrid
                genres={genres}
                onSelect={handleGenreSelect}
                loading={genresLoading}
              />
            </section>

            {/* 人気の番組（コンパクト表示） */}
            <section className="mt-8">
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
            </section>
          </>
        )}
      </div>

      {/* 番組追加リクエストダイアログ */}
      <PodcastRequestDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
      />
    </div>
  );
}
