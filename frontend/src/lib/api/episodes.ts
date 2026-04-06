import { apiGet, apiPost } from "./client";
import type { Episode, EpisodeDetailResult, EpisodeListResult, CreateEpisodeRequest, RecentEpisodesResult } from "@/types/episode";

export function getEpisodesByPodcast(
  podcastId: string,
  params?: { limit?: number; offset?: number }
): Promise<EpisodeListResult> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<EpisodeListResult>(
    `/podcasts/${encodeURIComponent(podcastId)}/episodes${query ? `?${query}` : ""}`
  );
}

export function getEpisode(id: string): Promise<EpisodeDetailResult> {
  return apiGet<EpisodeDetailResult>(`/episodes/${encodeURIComponent(id)}`);
}

export function createEpisode(
  podcastId: string,
  data: CreateEpisodeRequest
): Promise<Episode> {
  return apiPost<Episode>(
    `/podcasts/${encodeURIComponent(podcastId)}/episodes`,
    data
  );
}

/**
 * ユーザーが過去に聴取記録をつけた番組の新着エピソードを取得する。
 * 認証必須。
 */
export function getRecentEpisodes(): Promise<RecentEpisodesResult> {
  return apiGet<RecentEpisodesResult>("/users/me/recent-episodes");
}
