export interface ListeningRecord {
  id: string;
  user_id: string;
  episode_id: string;
  created_at: string;
}

export interface ListeningStatus {
  listened: boolean;
  listened_at?: string;
}

export interface ListeningRecordEpisode {
  id: string;
  title: string;
  podcast_id: string;
  artwork_url: string | null;
  published_at: string | null;
}

export interface ListeningRecordPodcast {
  id: string;
  title: string;
  artwork_url: string | null;
}

export interface ListeningRecordItem {
  id: string;
  episode: ListeningRecordEpisode;
  podcast: ListeningRecordPodcast;
  created_at: string;
}

export interface ListeningRecordListResult {
  records: ListeningRecordItem[];
  total: number;
}
