"use client";

import { useParams } from "next/navigation";
import { usePodcast } from "@/hooks/usePodcast";
import { useEpisodes } from "@/hooks/useEpisodes";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import PodcastDetail from "@/components/podcast/PodcastDetail";
import EpisodeList from "@/components/episode/EpisodeList";

export default function PodcastPageClient() {
  const params = useParams();
  const id = params.id as string;
  const { podcast, loading: podcastLoading, error: podcastError } = usePodcast(id);
  const { episodes, loading: episodesLoading, error: episodesError, hasMore, loadMore } = useEpisodes(id);

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
      <PodcastDetail podcast={podcast} />

      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">エピソード</h2>
        {episodesError ? (
          <ErrorMessage message={episodesError} />
        ) : (
          <EpisodeList
            episodes={episodes}
            loading={episodesLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        )}
      </div>
    </div>
  );
}
