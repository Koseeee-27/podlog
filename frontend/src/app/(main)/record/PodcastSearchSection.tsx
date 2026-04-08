"use client";

import { Suspense, useState } from "react";
import { usePodcastSearch } from "@/hooks/usePodcastSearch";
import { getEpisodesByPodcast } from "@/lib/api/episodes";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import SearchBar from "@/components/podcast/SearchBar";
import PodcastSelectCard from "@/components/podcast/PodcastSelectCard";
import Loading from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PodcastEpisodeList from "./PodcastEpisodeList";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { PodcastSearchItem } from "@/types/podcast";
import type { EpisodeListResult } from "@/types/episode";

/**
 * 番組検索セクション。
 *
 * - 検索バー + 検索結果一覧 + 番組選択時のエピソード表示を管理
 * - 番組選択時に getEpisodesByPodcast の Promise を作成し、
 *   PodcastEpisodeList に渡して use() + Suspense でローディングを管理
 */
export default function PodcastSearchSection() {
  const {
    query,
    results: searchResults,
    loading: searchLoading,
    error: searchError,
    search,
    clear,
  } = usePodcastSearch();

  const [inputValue, setInputValue] = useState("");
  const [selectedPodcast, setSelectedPodcast] =
    useState<PodcastSearchItem | null>(null);
  const [episodesPromise, setEpisodesPromise] =
    useState<Promise<EpisodeListResult> | null>(null);

  const isSearching = query.trim().length > 0;

  const handleSearchSubmit = () => {
    if (inputValue.trim()) {
      search(inputValue);
      setSelectedPodcast(null);
      setEpisodesPromise(null);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSelectedPodcast(null);
    setEpisodesPromise(null);
    if (!value.trim()) {
      clear();
    }
  };

  const handleSelectPodcast = (podcast: PodcastSearchItem) => {
    setSelectedPodcast(podcast);
    // イベントハンドラ内で Promise を作成（レンダリング中ではない）→ use() ルール準拠
    setEpisodesPromise(
      getEpisodesByPodcast(podcast.id, { limit: 20, offset: 0 }),
    );
  };

  const handleBack = () => {
    setSelectedPodcast(null);
    setEpisodesPromise(null);
  };

  return (
    <section>
        <h2 className="text-lg font-semibold text-stone-900 mb-3">
          番組を検索
        </h2>
        <SearchBar
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSearchSubmit}
          loading={searchLoading}
        />

        <div className="mt-4">
          {selectedPodcast && episodesPromise ? (
            /* 番組選択後: エピソード一覧（ErrorBoundary + Suspense でローディング・エラー管理） */
            <ErrorBoundary
              fallback={
                <ErrorMessage message="エピソードの読み込みに失敗しました" />
              }
            >
              <Suspense
                fallback={<Loading message="エピソードを読み込み中..." />}
              >
                <PodcastEpisodeList
                  podcast={selectedPodcast}
                  initialDataPromise={episodesPromise}
                  onBack={handleBack}
                />
              </Suspense>
            </ErrorBoundary>
          ) : isSearching ? (
            /* 検索中: 番組一覧 */
            <>
              {searchError && <ErrorMessage message={searchError} />}
              {!searchLoading && searchResults.length === 0 && !searchError && (
                <EmptyState
                  icon={<MagnifyingGlassIcon className="h-12 w-12" />}
                  message={`"${query}" に一致する番組が見つかりませんでした`}
                  description="別のキーワードで試してみてください"
                />
              )}
              <div className="space-y-2">
                {searchResults.map((podcast) => (
                  <PodcastSelectCard
                    key={podcast.id}
                    podcast={podcast}
                    onSelect={handleSelectPodcast}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
    </section>
  );
}
