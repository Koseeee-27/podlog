export interface Episode {
  id: string;
  podcast_id: string;
  itunes_track_id: number | null;
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
  review_count: number;
  average_rating: number;
}
