import { apiPost } from "./client";
import type { Podcast } from "@/types/podcast";
import type { Episode } from "@/types/episode";

/** 番組の手動登録リクエストボディ */
export interface CreatePodcastInput {
  title: string;
  author?: string;
  description?: string;
  artwork_url?: string;
  genre?: string;
}

/** エピソードの手動登録リクエストボディ */
export interface CreateEpisodeInput {
  title: string;
  description?: string;
  published_at?: string;
  duration_ms?: number;
}

/** 番組を手動登録する（管理者用） */
export function adminCreatePodcast(data: CreatePodcastInput): Promise<Podcast> {
  return apiPost<Podcast>("/admin/podcasts", data);
}

/** エピソードを手動登録する（管理者用） */
export function adminCreateEpisode(
  podcastId: string,
  data: CreateEpisodeInput
): Promise<Episode> {
  return apiPost<Episode>(
    `/admin/podcasts/${encodeURIComponent(podcastId)}/episodes`,
    data
  );
}
