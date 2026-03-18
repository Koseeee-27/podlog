export interface Episode {
  id: string;
  podcast_id: string;
  itunes_track_id: number | null;
  guid: string | null;
  title: string;
  description: string | null;
  audio_url: string | null;
  artwork_url: string | null;
  source_url: string | null;
  duration_ms: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EpisodeWithStats extends Episode {
  total_reviews: number;
  average_rating: number;
}

export interface EpisodeListItem {
  id: string;
  title: string;
  description: string | null;
  duration_ms: number | null;
  published_at: string | null;
  average_rating: number;
  total_reviews: number;
}

export interface EpisodeListResult {
  episodes: EpisodeListItem[];
  total: number;
}

export interface CreateEpisodeRequest {
  title: string;
  description?: string | null;
  audio_url?: string | null;
  artwork_url?: string | null;
  source_url?: string | null;
  duration_ms?: number | null;
  published_at?: string | null;
  itunes_track_id?: number | null;
}

export interface FetchFromFeedResult {
  new_count: number;
  skipped_count: number;
  failed_count: number;
  episodes: Episode[];
}
