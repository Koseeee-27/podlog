import { apiGet } from "./client";
import type { Podcast } from "@/types/podcast";

export function searchPodcasts(query: string): Promise<Podcast[]> {
  return apiGet<Podcast[]>(`/podcasts/search?q=${encodeURIComponent(query)}`);
}

export function getPodcast(id: string): Promise<Podcast> {
  return apiGet<Podcast>(`/podcasts/${encodeURIComponent(id)}`);
}
