"use client";

import { useEffect, useRef, useCallback, useTransition } from "react";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useFavoritePodcast } from "@/hooks/useFavoritePodcast";
import { fetchFromFeedAction } from "@/lib/actions/episodes";
import { useToast } from "@/components/ui/Toast";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PodcastDetail from "@/components/podcast/PodcastDetail";
import FavoriteButton from "@/components/podcast/FavoriteButton";
import EpisodeList from "@/components/episode/EpisodeList";
import type { Podcast } from "@/types/podcast";
import type { EpisodeListItem } from "@/types/episode";
import type { PodcastRatingResult } from "@/types/review";
import type { FavoritePodcastItem } from "@/types/user";

interface PodcastPageClientProps {
  id: string;
  initialPodcast: Podcast;
  initialFavoriteCount?: number;
  initialEpisodes?: EpisodeListItem[];
  initialRating: PodcastRatingResult | null;
  isAuthenticated: boolean;
  initialIsFavorite: boolean;
  initialFavorites: FavoritePodcastItem[];
}

export default function PodcastPageClient({
  id,
  initialPodcast,
  initialFavoriteCount,
  initialEpisodes,
  initialRating,
  isAuthenticated,
  initialIsFavorite,
  initialFavorites,
}: PodcastPageClientProps) {
  const { showToast } = useToast();

  // エピソード一覧: サーバーから取得した初期データを使い、ページネーションはクライアントで管理
  const {
    episodes,
    loading: episodesLoading,
    error: episodesError,
    hasMore,
    loadMore,
    refresh,
  } = useEpisodes(id, initialEpisodes ?? []);

  // お気に入り: 初期値は Server Component から渡される
  const {
    isFavorite,
    isPending: favoritePending,
    toggle: toggleFavorite,
  } = useFavoritePodcast({
    podcastId: id,
    initialIsFavorite,
    initialFavorites,
  });

  // RSS フィードからエピソードを取得（Server Action）
  const [fetchPending, startFetchTransition] = useTransition();
  const hasFetchedRef = useRef(false);

  const handleFetchFromFeed = useCallback(() => {
    startFetchTransition(async () => {
      const result = await fetchFromFeedAction(id);
      if (result.success && result.newCount && result.newCount > 0) {
        await refresh();
      }
      if (!result.success) {
        hasFetchedRef.current = false;
      }
    });
  }, [id, refresh]);

  // ログイン済みかつ feed_url がある場合のみ、初回に自動で RSS フィードからエピソードを取得する
  useEffect(() => {
    if (!isAuthenticated || !initialPodcast.feed_url || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    handleFetchFromFeed();
  }, [isAuthenticated, initialPodcast.feed_url, handleFetchFromFeed]);

  // toggle の結果に応じてトーストを表示
  const handleToggleFavorite = useCallback(async () => {
    const result = await toggleFavorite();
    if (result === "added") {
      showToast("好きな番組に追加しました");
    } else if (result === "removed") {
      showToast("好きな番組から削除しました");
    } else {
      showToast("操作に失敗しました", "error");
    }
  }, [toggleFavorite, showToast]);

  return (
    <div>
      <PodcastDetail
        podcast={initialPodcast}
        averageRating={initialRating?.average_rating}
        totalReviews={initialRating?.total_reviews}
        favoriteCount={initialFavoriteCount}
        hasRatingError={!initialRating}
        favoriteButton={
          isAuthenticated ? (
            <FavoriteButton
              isFavorite={isFavorite}
              isPending={favoritePending}
              onClick={handleToggleFavorite}
            />
          ) : undefined
        }
      />

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-stone-900">エピソード</h2>
        </div>

        {episodesError ? (
          <ErrorMessage message={episodesError} />
        ) : (
          <EpisodeList
            episodes={episodes}
            loading={episodesLoading || fetchPending}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        )}
      </div>
    </div>
  );
}
