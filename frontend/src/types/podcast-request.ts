/** 番組追加リクエストの作成時に送るリクエストボディ */
export interface CreatePodcastRequestInput {
  title: string;
  url?: string;
}

/** 番組追加リクエストの作成後に返されるレスポンス */
export interface PodcastRequestResult {
  id: string;
  title: string;
  url?: string;
  status: string;
  created_at: string;
}
