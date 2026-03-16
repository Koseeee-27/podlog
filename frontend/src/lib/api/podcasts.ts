import { apiGet } from "./client";
import type { Podcast, PodcastSearchItem, PodcastSearchResult } from "@/types/podcast";

export async function searchPodcasts(query: string): Promise<PodcastSearchItem[]> {
  const result = await apiGet<PodcastSearchResult>(`/podcasts/search?q=${encodeURIComponent(query)}`);
  return result.podcasts;
}

export function getPodcast(id: string): Promise<Podcast> {
  return apiGet<Podcast>(`/podcasts/${encodeURIComponent(id)}`);
}
