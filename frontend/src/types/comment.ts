/**
 * Comment ドメインの型定義（評価/感想分離後の新モデル）。
 *
 * 旧 review モデルから「感想（自由記述、X 風短文〜1000 字）」を切り出した。
 * 評価（1〜5 の星）は `types/rating.ts` に分離している。
 *
 * BE 仕様の対応:
 * - `Comment`                  … `model.Comment`（POST/PUT 単体レコード返却）
 * - `EpisodeCommentItem`       … `GET /episodes/{id}/comments` の `comments[]` 各要素
 *                                 （投稿者の `user` 情報を含む）
 * - `EpisodeCommentListResult` … `GET /episodes/{id}/comments` のレスポンス
 * - `UserCommentItem`          … `GET /users/me/comments` /
 *                                 `GET /users/{username}/comments` の `comments[]` 各要素
 *                                 （`episode` + `podcast` 情報を含む）
 * - `UserCommentListResult`    … 上記のレスポンス全体
 * - `TimelineItem`             … `GET /timeline` の `comments[]` 各要素
 *                                 （`user` + `episode` + `podcast` をすべて含む）
 * - `TimelineResult`           … `GET /timeline` のレスポンス
 *
 * BE は `display_name` / `avatar_url` / `artwork_url` を `omitempty` + ポインタ型で
 * 返すため、TS 側は `?:` （optional）で揃える。
 */

/** 感想（API レスポンス全体）。POST / PUT のレスポンスで使用 */
export interface Comment {
  id: string;
  user_id: string;
  episode_id: string;
  /** 1〜1000 字（前後 trim 済み） */
  body: string;
  created_at: string;
  updated_at: string;
}

/** 感想作成リクエスト（`POST /episodes/{id}/comments`） */
export interface CreateCommentRequest {
  body: string;
}

/** 感想更新リクエスト（`PUT /comments/{id}`） */
export interface UpdateCommentRequest {
  body: string;
}

/** 感想に紐づくユーザー情報（公開項目のみ） */
export interface CommentUser {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

/** 感想一覧に含まれるエピソード情報 */
export interface CommentEpisode {
  id: string;
  title: string;
  podcast_id: string;
  artwork_url?: string;
}

/** 感想一覧に含まれる番組情報 */
export interface CommentPodcast {
  id: string;
  title: string;
  artwork_url?: string;
}

/**
 * エピソード感想一覧の各行（`GET /episodes/{id}/comments` のレスポンス内 `comments[]`）。
 * 投稿者の `user` 情報を含む。
 */
export interface EpisodeCommentItem {
  id: string;
  user: CommentUser;
  body: string;
  created_at: string;
  updated_at: string;
}

/** エピソード感想一覧結果（`GET /episodes/{id}/comments`） */
export interface EpisodeCommentListResult {
  comments: EpisodeCommentItem[];
  total: number;
}

/**
 * ユーザー感想一覧の各行（`GET /users/me/comments` /
 * `GET /users/{username}/comments` のレスポンス内 `comments[]`）。
 * `episode` + `podcast` 情報を含む。
 */
export interface UserCommentItem {
  id: string;
  episode: CommentEpisode;
  podcast: CommentPodcast;
  body: string;
  created_at: string;
  updated_at: string;
}

/** ユーザー感想一覧結果（`GET /users/me/comments` / `GET /users/{username}/comments`） */
export interface UserCommentListResult {
  comments: UserCommentItem[];
  total: number;
}

/**
 * タイムラインの各行（`GET /timeline` のレスポンス内 `comments[]`）。
 * `user` + `episode` + `podcast` をすべて含む（一覧で完結表示できる）。
 */
export interface TimelineItem {
  id: string;
  user: CommentUser;
  episode: CommentEpisode;
  podcast: CommentPodcast;
  body: string;
  created_at: string;
  updated_at: string;
}

/** タイムライン結果（`GET /timeline`、新 comment ベース） */
export interface TimelineResult {
  comments: TimelineItem[];
  total: number;
}
