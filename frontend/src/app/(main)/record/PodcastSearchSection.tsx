"use client";

import { Suspense, useState, useTransition, useRef } from "react";
import { searchPodcasts } from "@/lib/api/podcasts";
import { getEpisodesByPodcast } from "@/lib/api/episodes";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import SearchBar from "@/components/podcast/SearchBar";
import PodcastSelectCard from "@/components/podcast/PodcastSelectCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PodcastEpisodeList, { PAGE_SIZE } from "./PodcastEpisodeList";
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

  // race 対策: 発行したリクエストに通し番号を振り、応答到着時に最新と一致するか判定する。
  // useTransition は応答順を保証しないため、「A → AB」連打や「応答待ち中のクリア」で
  // 古い応答が新しい結果を上書きする race condition が発生しうる
  // （React 公式 useTransition の "out of order" トラブルシューティング参照）。
  const requestIdRef = useRef(0);

  const isSearching = query.trim().length > 0;

  const handleSearchSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // 自分のリクエスト番号を発行（事前インクリメントで値を取得）
    const requestId = ++requestIdRef.current;
    setQuery(trimmed);
    setSelectedPodcast(null);
    setEpisodesPromise(null);
    setSearchError(null);

    startSearchTransition(async () => {
      try {
        const data = await searchPodcasts(trimmed);
        if (requestId !== requestIdRef.current) return; // stale 応答は破棄
        setSearchResults(data);
      } catch (err) {
        // 早いリクエストが成功してから遅いリクエストがエラーになるケースで
        // setSearchError が不適切に上書きされないよう、catch 側も stale を破棄する
        if (requestId !== requestIdRef.current) return;
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
      // 新しい操作として番号を進め、遅れて届く stale 応答の上書きを無効化する
      requestIdRef.current += 1;
      setQuery("");
      setSearchResults([]);
      setSearchError(null);
    }
  };

  const handleSelectPodcast = (podcast: PodcastSearchItem) => {
    setSelectedPodcast(podcast);
    // イベントハンドラ内で Promise を作成（レンダリング中ではない）→ use() ルール準拠
    setEpisodesPromise(
      getEpisodesByPodcast(podcast.id, { limit: PAGE_SIZE, offset: 0 }),
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
          <ErrorBoundary>
            <Suspense fallback={<EpisodeListSkeleton />}>
              <PodcastEpisodeList
                key={selectedPodcast.id}
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
