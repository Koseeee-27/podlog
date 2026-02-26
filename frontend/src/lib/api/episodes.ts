import { apiGet, apiPost } from "./client";
import type { Episode, EpisodeWithStats, CreateEpisodeRequest } from "@/types/episode";

export function getEpisodesByPodcast(
  podcastId: string,
  params?: { limit?: number; offset?: number }
): Promise<Episode[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const query = searchParams.toString();
  return apiGet<Episode[]>(
    `/podcasts/${encodeURIComponent(podcastId)}/episodes${query ? `?${query}` : ""}`
  );
}

export function getEpisode(id: string): Promise<EpisodeWithStats> {
  return apiGet<EpisodeWithStats>(`/episodes/${encodeURIComponent(id)}`);
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
