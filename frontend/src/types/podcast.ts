export interface Podcast {
  id: string;
  itunes_id: number | null;
  title: string;
  author: string | null;
  description: string | null;
  feed_url: string | null;
  artwork_url: string | null;
  itunes_url: string | null;
  genre: string | null;
  source_type: "itunes" | "radiko" | "manual";
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PodcastSearchItem {
  id: string;
  title: string;
  author: string | null;
  artwork_url: string | null;
  average_rating: number;
  total_reviews: number;
  favorite_count: number;
}

export interface PodcastDetailResult extends Podcast {
  average_rating: number;
  total_reviews: number;
  favorite_count: number;
}

export interface PodcastSearchResult {
  podcasts: PodcastSearchItem[];
  total: number;
}
