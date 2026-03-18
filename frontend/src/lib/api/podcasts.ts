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

export async function getPodcastsByGenre(genre: string): Promise<PodcastSearchItem[]> {
  const params = new URLSearchParams({ genre, q: "" });
  const result = await apiGet<PodcastSearchResult>(`/podcasts/search?${params.toString()}`);
  return result.podcasts;
}

export function getPodcast(id: string): Promise<Podcast> {
  return apiGet<Podcast>(`/podcasts/${encodeURIComponent(id)}`);
}

export async function getPopularPodcasts(limit = 10): Promise<PodcastSearchItem[]> {
  const result = await apiGet<PodcastSearchResult>(`/podcasts/popular?limit=${limit}`);
  return result.podcasts;
}
