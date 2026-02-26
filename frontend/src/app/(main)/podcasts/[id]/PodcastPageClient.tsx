"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { usePodcast } from "@/hooks/usePodcast";
import { useEpisodes, useFetchFromFeed } from "@/hooks/useEpisodes";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Button from "@/components/ui/Button";
import PodcastDetail from "@/components/podcast/PodcastDetail";
import EpisodeList from "@/components/episode/EpisodeList";

export default function PodcastPageClient() {
  const params = useParams();
  const id = params.id as string;
  const { podcast, loading: podcastLoading, error: podcastError } = usePodcast(id);
  const { episodes, loading: episodesLoading, error: episodesError, hasMore, loadMore, refresh } = useEpisodes(id);
  const { fetchFromFeed, loading: fetchLoading, error: fetchError, result: fetchResult } = useFetchFromFeed(id);
  const [showFetchResult, setShowFetchResult] = useState(false);
  const hasFetchedRef = useRef(false);

  // feed_url がある場合、初回エピソードロード完了後に自動でRSSフィードからエピソードを取得
  // episodesLoading を依存に入れることで、初回ロード完了を待ってからフェッチする
  // hasFetchedRef はフェッチ成功時のみ true にし、失敗時はページ再読み込みでリトライ可能にする
  useEffect(() => {
    if (!podcast?.feed_url || hasFetchedRef.current || episodesLoading) return;
    hasFetchedRef.current = true;

    (async () => {
      const result = await fetchFromFeed();
      if (result) {
        if (result.new_count > 0) {
          setShowFetchResult(true);
          await refresh();
        }
      } else {
        // フェッチ失敗時はリトライ可能にする
        hasFetchedRef.current = false;
      }
    })();
  }, [podcast, fetchFromFeed, refresh, episodesLoading]);

  if (podcastLoading) {
    return <Loading />;
  }

  if (podcastError) {
    return <ErrorMessage message={podcastError} />;
  }

  if (!podcast) {
    return <ErrorMessage message="ポッドキャストが見つかりません" />;
  }

  const handleFetchFromFeed = async () => {
    setShowFetchResult(false);
    const result = await fetchFromFeed();
    if (result) {
      setShowFetchResult(true);
      await refresh();
    }
  };

  return (
    <div>
      <PodcastDetail podcast={podcast} />

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">エピソード</h2>
          {podcast.feed_url && (
            <Button
              variant="outline"
              size="sm"
              loading={fetchLoading}
              onClick={handleFetchFromFeed}
            >
              RSSから再取得
            </Button>
          )}
        </div>

        {fetchError && (
          <div className="mb-4">
            <ErrorMessage message={fetchError} />
          </div>
        )}

        {showFetchResult && fetchResult && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
            <p>
              新規 <span className="font-bold">{fetchResult.new_count}</span> 件を追加、
              スキップ <span className="font-bold">{fetchResult.skipped_count}</span> 件
              {fetchResult.failed_count > 0 && (
                <>、失敗 <span className="font-bold">{fetchResult.failed_count}</span> 件</>
              )}
            </p>
          </div>
        )}

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
