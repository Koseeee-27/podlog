"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEpisodes, useFetchFromFeed } from "@/hooks/useEpisodes";
import { useFavoritePodcast } from "@/hooks/useFavoritePodcast";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PodcastDetail from "@/components/podcast/PodcastDetail";
import FavoriteButton from "@/components/podcast/FavoriteButton";
import EpisodeList from "@/components/episode/EpisodeList";
import type { Podcast } from "@/types/podcast";
import type { EpisodeListItem } from "@/types/episode";
import type { PodcastRatingResult } from "@/types/review";

interface PodcastPageClientProps {
  id: string;
  initialPodcast: Podcast;
  initialFavoriteCount?: number;
  initialEpisodes?: EpisodeListItem[];
  initialRating: PodcastRatingResult | null;
}

export default function PodcastPageClient({
  id,
  initialPodcast,
  initialFavoriteCount,
  initialEpisodes,
  initialRating,
}: PodcastPageClientProps) {
  const auth = useAuth();
  const status = auth.status;
  const username = status === "authenticated" ? auth.profile.username : undefined;
  const { showToast } = useToast();

  // エピソード一覧: サーバーから取得した初期データを使い、ページネーションはクライアントで管理
  const {
    episodes,
    loading: episodesLoading,
    error: episodesError,
    hasMore,
    loadMore,
    refresh,
  } = useEpisodes(id, initialEpisodes);

  const { fetchFromFeed, loading: fetchLoading } = useFetchFromFeed(id);

  const {
    isFavorite,
    loading: favoriteLoading,
    isPending: favoritePending,
    toggle: toggleFavorite,
    fetchFailed: favoriteFetchFailed,
  } = useFavoritePodcast(id, username);
  const hasFetchedRef = useRef(false);

  // toggle の結果に応じてトーストを表示
  const handleToggleFavorite = useCallback(async () => {
    const result = await toggleFavorite();
    if (result === "added") {
      showToast("好きな番組に追加しました");
    } else if (result === "removed") {
      showToast("好きな番組から削除しました");
    } else {
      // result === null はエラー
      showToast("操作に失敗しました", "error");
    }
  }, [toggleFavorite, showToast]);

  // ログイン済みかつ feed_url がある場合のみ、初回に
  // 自動で RSS フィードからエピソードを取得する。
  // 未ログイン時は認証が必要な POST エンドポイントを叩けないため実行しない。
  const isAuthenticated = status === "authenticated" || status === "no_profile";
  useEffect(() => {
    if (!isAuthenticated || !initialPodcast.feed_url || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    (async () => {
      const result = await fetchFromFeed();
      if (result) {
        if (result.new_count > 0) {
          await refresh();
        }
      } else {
        // フェッチ失敗時はリトライ可能にする
        hasFetchedRef.current = false;
      }
    })();
  }, [isAuthenticated, initialPodcast.feed_url, fetchFromFeed, refresh]);

  // ログイン済みかつお気に入り取得完了かつ取得成功時のみボタンを表示
  const showFavoriteButton = status === "authenticated" && !favoriteLoading && !favoriteFetchFailed;

  return (
    <div>
      <PodcastDetail
        podcast={initialPodcast}
        averageRating={initialRating?.average_rating}
        totalReviews={initialRating?.total_reviews}
        favoriteCount={initialFavoriteCount}
        hasRatingError={!initialRating}
        favoriteButton={
          showFavoriteButton ? (
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
            loading={episodesLoading || fetchLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        )}
      </div>
    </div>
  );
}
