import { serverGet } from "@/lib/api/server";
import EpisodeListClient from "./EpisodeListClient";
import type { EpisodeListResult } from "@/types/episode";

interface EpisodeSectionProps {
  podcastId: string;
}

/**
 * エピソード一覧の Server Component。
 * エピソード初期データを取得し、EpisodeListClient に渡す。
 * 取得失敗時は throw して ErrorBoundary に委譲する。
 */
export default async function EpisodeSection({ podcastId }: EpisodeSectionProps) {
  const result = await serverGet<EpisodeListResult>(
    `/podcasts/${encodeURIComponent(podcastId)}/episodes?limit=20&offset=0`,
    { noAuth: true, revalidate: 60 },
  );

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-stone-900 mb-4">エピソード</h2>
      <EpisodeListClient
        podcastId={podcastId}
        initialEpisodes={result.episodes}
        fetchFailed={false}
      />
    </div>
  );
}
