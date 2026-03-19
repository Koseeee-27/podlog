import { apiGet } from "./client";
import type { Podcast, PodcastSearchItem, PodcastSearchResult } from "@/types/podcast";

export async function searchPodcasts(
  query: string,
  options?: { genre?: string }
): Promise<PodcastSearchItem[]> {
  const params = new URLSearchParams({ q: query });
  if (options?.genre) {
    params.set("genre", options.genre);
  }
  const result = await apiGet<PodcastSearchResult>(`/podcasts/search?${params.toString()}`);
  return result.podcasts;
}

export async function getPodcastsByGenre(
  genre: string,
  options?: { limit?: number; offset?: number }
): Promise<PodcastSearchResult> {
  const params = new URLSearchParams({ genre });
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.offset != null) params.set("offset", String(options.offset));
  return apiGet<PodcastSearchResult>(`/podcasts/search?${params.toString()}`);
}

export function getPodcast(id: string): Promise<Podcast> {
  return apiGet<Podcast>(`/podcasts/${encodeURIComponent(id)}`);
}

export async function getPopularPodcasts(limit = 10): Promise<PodcastSearchItem[]> {
  const result = await apiGet<PodcastSearchResult>(`/podcasts/popular?limit=${limit}`);
  return result.podcasts;
}
