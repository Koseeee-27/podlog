"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePodcast } from "@/hooks/usePodcast";
import { useEpisodes, useFetchFromFeed } from "@/hooks/useEpisodes";
import { usePodcastRating } from "@/hooks/useReviews";
import { useFavoritePodcast } from "@/hooks/useFavoritePodcast";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PodcastDetail from "@/components/podcast/PodcastDetail";
import FavoriteButton from "@/components/podcast/FavoriteButton";
import EpisodeList from "@/components/episode/EpisodeList";

interface PodcastPageClientProps {
  id: string;
}

export default function PodcastPageClient({ id }: PodcastPageClientProps) {
  const auth = useAuth();
  const status = auth.status;
  const username = status === "authenticated" ? auth.profile.username : undefined;
  const { showToast } = useToast();
  const { podcast, loading: podcastLoading, error: podcastError } = usePodcast(id);
  const { episodes, loading: episodesLoading, error: episodesError, hasMore, loadMore, refresh } = useEpisodes(id);
  const { fetchFromFeed, loading: fetchLoading } = useFetchFromFeed(id);
  const { rating, error: ratingError } = usePodcastRating(id);
  const {
    isFavorite,
    loading: favoriteLoading,
    isPending: favoritePending,
    error: favoriteError,
    toggle: toggleFavorite,
    fetchFailed: favoriteFetchFailed,
  } = useFavoritePodcast(id, username);
  const hasFetchedRef = useRef(false);

  // favoriteError が発生したらエラートーストを表示
  useEffect(() => {
    if (favoriteError) {
      showToast(favoriteError, "error");
    }
  }, [favoriteError, showToast]);

  // toggle の結果に応じてトーストを表示（isFavorite の監視ではなく操作の結果で判定）
  const handleToggleFavorite = useCallback(async () => {
    const result = await toggleFavorite();
    if (result === "added") {
      showToast("好きな番組に追加しました");
    } else if (result === "removed") {
      showToast("好きな番組から削除しました");
    }
  }, [toggleFavorite, showToast]);

  // ログイン済みかつ feed_url がある場合のみ、初回エピソードロード完了後に
  // 自動で RSS フィードからエピソードを取得する。
  // 未ログイン時は認証が必要な POST エンドポイントを叩けないため実行しない。
  const isAuthenticated = status === "authenticated" || status === "no_profile";
  useEffect(() => {
    if (!isAuthenticated || !podcast?.feed_url || hasFetchedRef.current || episodesLoading) return;
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
  }, [isAuthenticated, podcast, fetchFromFeed, refresh, episodesLoading]);

  if (podcastLoading) {
    return <Loading />;
  }

  if (podcastError) {
    return <ErrorMessage message={podcastError} />;
  }

  if (!podcast) {
    return <ErrorMessage message="ポッドキャストが見つかりません" />;
  }

  // ログイン済みかつお気に入り取得完了かつ取得成功時のみボタンを表示
  const showFavoriteButton = status === "authenticated" && !favoriteLoading && !favoriteFetchFailed;

  return (
    <div>
      <PodcastDetail
        podcast={podcast}
        averageRating={rating?.average_rating}
        totalReviews={rating?.total_reviews}
        hasRatingError={!!ratingError}
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
