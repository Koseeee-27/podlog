"use client";

import { Suspense, useState, useTransition } from "react";
import { searchPodcasts } from "@/lib/api/podcasts";
import { getEpisodesByPodcast } from "@/lib/api/episodes";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import SearchBar from "@/components/podcast/SearchBar";
import PodcastSelectCard from "@/components/podcast/PodcastSelectCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PodcastEpisodeList from "./PodcastEpisodeList";
import { EpisodeListSkeleton } from "./skeletons";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import type { PodcastSearchItem } from "@/types/podcast";
import type { EpisodeListResult } from "@/types/episode";

/**
 * 番組検索セクション。
 *
 * - 検索バー + 検索結果一覧 + 番組選択時のエピソード表示を管理
 * - 番組検索は useTransition でローディングを管理
 * - 番組選択時に getEpisodesByPodcast の Promise を作成し、
 *   PodcastEpisodeList に渡して use() + Suspense でローディングを管理
 */
export default function PodcastSearchSection() {
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PodcastSearchItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchPending, startSearchTransition] = useTransition();

  const [selectedPodcast, setSelectedPodcast] =
    useState<PodcastSearchItem | null>(null);
  const [episodesPromise, setEpisodesPromise] =
    useState<Promise<EpisodeListResult> | null>(null);

  const isSearching = query.trim().length > 0;

  const handleSearchSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setQuery(trimmed);
    setSelectedPodcast(null);
    setEpisodesPromise(null);
    setSearchError(null);

    startSearchTransition(async () => {
      try {
        const data = await searchPodcasts(trimmed);
        setSearchResults(data);
      } catch (err) {
        setSearchError(
          getUserFriendlyErrorMessage(err, "検索に失敗しました"),
        );
        setSearchResults([]);
      }
    });
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSelectedPodcast(null);
    setEpisodesPromise(null);
    if (!value.trim()) {
      setQuery("");
      setSearchResults([]);
      setSearchError(null);
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
        loading={isSearchPending}
      />

      <div className="mt-4">
        {selectedPodcast && episodesPromise ? (
          /* 番組選択後: エピソード一覧（ErrorBoundary + Suspense でローディング・エラー管理） */
          <ErrorBoundary
            fallback={
              <ErrorMessage message="エピソードの読み込みに失敗しました" />
            }
          >
            <Suspense fallback={<EpisodeListSkeleton />}>
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
            {!isSearchPending &&
              searchResults.length === 0 &&
              !searchError && (
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
