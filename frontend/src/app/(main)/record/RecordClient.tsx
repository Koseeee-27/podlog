"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useRecentEpisodes } from "@/hooks/useRecentEpisodes";
import { usePodcastSearch } from "@/hooks/usePodcastSearch";
import { useEpisodes } from "@/hooks/useEpisodes";
import Image from "next/image";
import Link from "next/link";
import SearchBar from "@/components/podcast/SearchBar";
import PodcastSelectCard from "@/components/podcast/PodcastSelectCard";
import RecentEpisodeCard from "@/components/episode/RecentEpisodeCard";
import EpisodeCard from "@/components/episode/EpisodeCard";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import {
  MagnifyingGlassIcon,
  MicrophoneIcon,
  ArrowLeftIcon,
  PlusCircleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import type { PodcastSearchItem } from "@/types/podcast";

/**
 * 番組選択後のエピソード一覧を表示するサブコンポーネント。
 * useEpisodes はフックなので条件付き呼び出しができないため、
 * 別コンポーネントとして切り出している。
 */
function PodcastEpisodeList({ podcast, onBack }: { podcast: PodcastSearchItem; onBack: () => void }) {
  const { episodes, loading, error, hasMore, loadMore } = useEpisodes(podcast.id);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 transition-colors mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        検索結果に戻る
      </button>

      <div className="flex items-center gap-3 mb-4">
        {podcast.artwork_url && (
          <Image
            src={podcast.artwork_url}
            alt={podcast.title}
            width={40}
            height={40}
            className="w-10 h-10 rounded-lg object-cover"
          />
        )}
        <h2 className="text-lg font-bold text-stone-900">{podcast.title}</h2>
      </div>

      {loading && episodes.length === 0 && <Loading message="エピソードを読み込み中..." />}
      {error && <ErrorMessage message={error} />}

      {!loading && episodes.length === 0 && !error && (
        <EmptyState
          icon={<MicrophoneIcon className="h-12 w-12" />}
          message="エピソードはまだありません"
        />
      )}

      <div className="space-y-2">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} showListenButton />
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-full hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function RecordClient() {
  const auth = useAuth();
  const isAuthenticated = auth.status === "authenticated";

  const {
    podcastGroups,
    loading: recentLoading,
    error: recentError,
    isEmpty: recentEmpty,
    recordedPodcastCount,
  } = useRecentEpisodes(isAuthenticated);

  const {
    query,
    results: searchResults,
    loading: searchLoading,
    error: searchError,
    search,
    clear,
  } = usePodcastSearch();

  const [inputValue, setInputValue] = useState("");
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastSearchItem | null>(null);

  const isSearching = query.trim().length > 0;

  const handleSearchSubmit = () => {
    if (inputValue.trim()) {
      search(inputValue);
      setSelectedPodcast(null);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSelectedPodcast(null);
    if (!value.trim()) {
      clear();
    }
  };

  // 初回利用の判定: 記録をつけた番組が0件の場合
  // recorded_podcast_count で判定するため、「記録はあるが新着なし」と区別できる
  const isFirstTimeUser = !recentLoading && recordedPodcastCount === 0 && !recentError;

  // ローディング中
  if (auth.status === "loading") {
    return <Loading />;
  }

  // 未認証 → ログイン、プロフィール未設定 → セットアップへリダイレクト
  if (auth.status === "unauthenticated") {
    redirect("/login");
  }
  if (auth.status === "no_profile") {
    redirect("/profile/setup");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">記録する</h1>

      {/* 番組検索セクション */}
      <section>
        <h2 className="text-lg font-semibold text-stone-900 mb-3">
          {isFirstTimeUser
            ? "まずは番組を検索して、聴いたエピソードを記録しましょう"
            : "番組を検索"
          }
        </h2>
        <SearchBar value={inputValue} onChange={handleInputChange} onSubmit={handleSearchSubmit} loading={searchLoading} />

        <div className="mt-4">
          {selectedPodcast ? (
            /* 番組選択後: エピソード一覧 */
            <PodcastEpisodeList
              podcast={selectedPodcast}
              onBack={() => setSelectedPodcast(null)}
            />
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
                    onSelect={setSelectedPodcast}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* 新着エピソードセクション（検索中でなく、初回ユーザーでもない場合に表示） */}
      {!isSearching && !isFirstTimeUser && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">
            <PlusCircleIcon className="inline h-5 w-5 mr-1.5 text-rose-500 align-text-bottom" />
            記録した番組の新着エピソード
          </h2>

          {recentLoading && <Loading message="新着エピソードを読み込み中..." />}
          {recentError && <ErrorMessage message={recentError} />}

          {!recentLoading && recentEmpty && !recentError && (
            <p className="text-sm text-stone-500 py-4">新着エピソードはありません</p>
          )}

          {/* 番組ごとにグループ化して表示 */}
          <div className="space-y-6">
            {podcastGroups.map((group) => (
              <div key={group.podcast.id}>
                {/* 番組ヘッダー: アートワーク + 番組名 */}
                <Link
                  href={`/podcasts/${group.podcast.id}`}
                  className="flex items-center gap-3 mb-2 group"
                >
                  {group.podcast.artwork_url ? (
                    <Image
                      src={group.podcast.artwork_url}
                      alt={group.podcast.title}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <MicrophoneIcon className="h-5 w-5 text-stone-400" />
                    </div>
                  )}
                  <h3 className="text-sm font-semibold text-stone-900 group-hover:text-rose-600 transition-colors line-clamp-1">
                    {group.podcast.title}
                  </h3>
                </Link>

                {/* エピソード一覧（最大3件） */}
                <div className="space-y-1.5 ml-[52px]">
                  {group.episodes.map((episode) => (
                    <RecentEpisodeCard key={episode.id} episode={episode} showListenButton />
                  ))}
                </div>

                {/* 「もっと見る」リンク（未聴取が3件より多い場合） */}
                {group.total_unlistened > 3 && (
                  <div className="ml-[52px] mt-1.5">
                    <Link
                      href={`/podcasts/${group.podcast.id}`}
                      className="inline-flex items-center gap-0.5 text-xs text-stone-500 hover:text-rose-600 transition-colors"
                    >
                      もっと見る（残り{group.total_unlistened - group.episodes.length}件）
                      <ChevronRightIcon className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
