import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import EpisodeListClient from "./EpisodeListClient";
import type { EpisodeListResult } from "@/types/episode";

interface EpisodeSectionProps {
  podcastId: string;
  feedUrl?: string;
}

/**
 * エピソード一覧の Server Component。
 * エピソード初期データを取得し、EpisodeListClient に渡す。
 */
export default async function EpisodeSection({ podcastId, feedUrl }: EpisodeSectionProps) {
  const [episodesResult, supabase] = await Promise.all([
    serverGet<EpisodeListResult>(
      `/podcasts/${encodeURIComponent(podcastId)}/episodes?limit=20&offset=0`,
      { noAuth: true, revalidate: 60 },
    ).catch(() => null),
    createClient(),
  ]);

  const { data: { session } } = await supabase.auth.getSession();

  const initialEpisodes = episodesResult?.episodes ?? [];

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-stone-900">エピソード</h2>
      </div>
      <EpisodeListClient
        podcastId={podcastId}
        initialEpisodes={initialEpisodes}
        feedUrl={feedUrl}
        isAuthenticated={!!session}
      />
    </div>
  );
}
