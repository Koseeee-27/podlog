import { apiGet } from "./client";
import type { Podcast, PodcastSearchItem, PodcastSearchResult } from "@/types/podcast";

export async function searchPodcasts(query: string): Promise<PodcastSearchItem[]> {
  const result = await apiGet<PodcastSearchResult>(`/podcasts/search?q=${encodeURIComponent(query)}`);
  return result.podcasts;
}

export function getPodcast(id: string): Promise<Podcast> {
  return apiGet<Podcast>(`/podcasts/${encodeURIComponent(id)}`);
}

export async function getPopularPodcasts(limit = 10): Promise<PodcastSearchItem[]> {
  const result = await apiGet<PodcastSearchResult>(`/podcasts/popular?limit=${limit}`);
  return result.podcasts;
}
