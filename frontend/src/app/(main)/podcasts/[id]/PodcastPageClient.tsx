"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { usePodcast } from "@/hooks/usePodcast";
import { useEpisodes, useFetchFromFeed } from "@/hooks/useEpisodes";
import { usePodcastRating } from "@/hooks/useReviews";
import { useAuth } from "@/hooks/useAuth";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PodcastDetail from "@/components/podcast/PodcastDetail";
import EpisodeList from "@/components/episode/EpisodeList";

export default function PodcastPageClient() {
  const params = useParams();
  const id = params.id as string;
  const { status } = useAuth();
  const { podcast, loading: podcastLoading, error: podcastError } = usePodcast(id);
  const { episodes, loading: episodesLoading, error: episodesError, hasMore, loadMore, refresh } = useEpisodes(id);
  const { fetchFromFeed, loading: fetchLoading } = useFetchFromFeed(id);
  const { rating, error: ratingError } = usePodcastRating(id);
  const hasFetchedRef = useRef(false);

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

  return (
    <div>
      <PodcastDetail
        podcast={podcast}
        averageRating={rating?.average_rating}
        totalReviews={rating?.total_reviews}
        hasRatingError={!!ratingError}
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
