"use client";

import { use, useState, useTransition } from "react";
import Image from "next/image";
import {
  ArrowLeftIcon,
  MicrophoneIcon,
} from "@heroicons/react/24/outline";
import { getEpisodesByPodcast } from "@/lib/api/episodes";
import EpisodeCard from "@/components/episode/EpisodeCard";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import type { PodcastSearchItem } from "@/types/podcast";
import type { EpisodeListItem, EpisodeListResult } from "@/types/episode";

export const PAGE_SIZE = 20;

/**
 * 番組選択後のエピソード一覧。
 *
 * - use() で初期データの Promise を消費（Suspense がローディングを管理）
 * - ページネーション（もっと見る）は useTransition で管理
 */
export default function PodcastEpisodeList({
  podcast,
  initialDataPromise,
  onBack,
}: {
  podcast: PodcastSearchItem;
  initialDataPromise: Promise<EpisodeListResult>;
  onBack: () => void;
}) {
  const initialResult = use(initialDataPromise);
  const initialEpisodes = initialResult.episodes ?? [];

  const [episodes, setEpisodes] = useState<EpisodeListItem[]>(initialEpisodes);
  const [total, setTotal] = useState(initialResult.total);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // `list.length >= PAGE_SIZE` での判定だと、総件数がちょうど PAGE_SIZE の
  // 倍数のときに「もっと見る」が 1 回空振りクリックされる不具合が起きるため、
  // 総件数ベースの派生値で判定する。
  const hasMore = episodes.length < total;

  const handleLoadMore = () => {
    setError(null);
    startTransition(async () => {
      try {
        const data = await getEpisodesByPodcast(podcast.id, {
          limit: PAGE_SIZE,
          offset: episodes.length,
        });
        const list = data.episodes ?? [];
        setEpisodes((prev) => [...prev, ...list]);
        setTotal(data.total);
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err));
      }
    });
  };

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

      {error && <ErrorMessage message={error} />}

      {episodes.length === 0 && !error && (
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
            onClick={handleLoadMore}
            disabled={isPending}
            className="px-6 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-full hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </div>
  );
}
