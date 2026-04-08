"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePodcastSearch, useGenrePodcasts } from "@/hooks/usePodcastSearch";
import { useAuth } from "@/hooks/useAuth";
import SearchBar from "@/components/podcast/SearchBar";
import PodcastCard from "@/components/podcast/PodcastCard";
import GenreGrid from "@/components/discover/GenreGrid";
import PodcastRequestDialog from "@/components/discover/PodcastRequestDialog";
import LoginPromptButton from "@/components/ui/LoginPromptButton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import { MagnifyingGlassIcon, MicrophoneIcon, PlusCircleIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { PodcastSearchItem } from "@/types/podcast";
import type { Genre } from "@/types/genre";

interface DiscoverClientProps {
  initialQuery: string;
  initialGenre: string | null;
  initialResults?: PodcastSearchItem[];
  initialGenres?: Genre[];
  initialPopularPodcasts?: PodcastSearchItem[];
  initialGenrePodcasts?: PodcastSearchItem[];
  initialGenreTotal?: number;
  genresError?: boolean;
  popularError?: boolean;
}

export default function DiscoverClient({
  initialQuery,
  initialGenre,
  initialResults = [],
  initialGenres = [],
  initialPopularPodcasts = [],
  initialGenrePodcasts = [],
  initialGenreTotal = 0,
  genresError = false,
  popularError = false,
}: DiscoverClientProps) {
  const { query, results, loading: searchLoading, error: searchError, search, clear } =
    usePodcastSearch({ initialQuery, initialResults });
  const [inputValue, setInputValue] = useState(initialQuery);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const router = useRouter();
  const auth = useAuth();

  const genres = initialGenres;
  const popular = initialPopularPodcasts;

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
      // URL のクエリパラメータを消して page.tsx を再実行し、ジャンル・人気番組を再取得
      if (initialQuery) {
        router.replace("/discover");
      }
    }
  };

  // ジャンル別番組: Server Component で取得した初回データを使い、loadMore のみ Client で行う
  const {
    podcasts: genrePodcasts,
    error: genreError,
    hasMore: genreHasMore,
    loadMore: genreLoadMore,
    isLoadingMore: genreIsLoadingMore,
  } = useGenrePodcasts(initialGenre, {
    initialData: initialGenrePodcasts,
    initialTotal: initialGenreTotal,
  });

  const handleGenreSelect = (genreId: string) => {
    // URL パラメータで genre を指定し、page.tsx（Server Component）を再実行
    router.push(`/discover?genre=${encodeURIComponent(genreId)}`);
  };

  const handleBackToGenres = () => {
    router.push("/discover");
  };

  // 選択中のジャンルの日本語名を取得
  const selectedGenreName = genres.find((g) => g.id === initialGenre)?.name_ja;

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
        ) : initialGenre !== null ? (
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
              {selectedGenreName ?? initialGenre}の番組
            </h2>

            {genreError && <ErrorMessage message={genreError} />}

            {genrePodcasts.length === 0 && !genreError && (
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
              {genresError ? (
                <ErrorMessage message="ジャンルの取得に失敗しました" />
              ) : (
                <GenreGrid
                  genres={genres}
                  onSelect={handleGenreSelect}
                />
              )}
            </section>

            {/* 人気の番組（コンパクト表示） */}
            <section className="mt-8">
              <h2 className="text-lg font-bold text-stone-900 mb-4">人気の番組</h2>

              {popularError ? (
                <ErrorMessage message="人気の番組の取得に失敗しました" />
              ) : popular.length === 0 ? (
                <p className="text-sm text-stone-500">まだレビューのある番組がありません</p>
              ) : null}

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
