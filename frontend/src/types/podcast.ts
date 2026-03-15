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

export interface PodcastSearchResult {
  podcasts: Podcast[];
  total: number;
}
