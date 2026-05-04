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
  total_ratings: number;
  average_rating: number;
}

/** エピソード詳細 API（GET /episodes/:id）のレスポンス型。
 * バックエンドが omitempty で返すフィールドは optional にしている。 */
export interface EpisodeDetailResult {
  id: string;
  title: string;
  description?: string | null;
  audio_url?: string | null;
  artwork_url?: string | null;
  duration_ms?: number | null;
  published_at?: string | null;
  created_at: string;
  podcast: EpisodePodcastInfo;
  average_rating: number;
  total_ratings: number;
}

export interface EpisodePodcastInfo {
  id: string;
  title: string;
  artwork_url?: string | null;
}

export interface EpisodeListItem {
  id: string;
  title: string;
  description?: string | null;
  duration_ms?: number | null;
  published_at?: string | null;
  average_rating: number;
  total_ratings: number;
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

/** GET /api/v1/users/me/recent-episodes のレスポンス内のエピソード */
export interface RecentEpisodeItem {
  id: string;
  title: string;
  description?: string | null;
  duration_ms?: number | null;
  published_at?: string | null;
}

/** 番組ごとにグループ化された未聴取エピソード */
export interface RecentPodcastGroup {
  podcast: EpisodePodcastInfo;
  episodes: RecentEpisodeItem[];
  total_unlistened: number;
}

/** GET /api/v1/users/me/recent-episodes のレスポンス（番組グループ化形式） */
export interface RecentEpisodesResult {
  podcasts: RecentPodcastGroup[];
  recorded_podcast_count: number;
}
