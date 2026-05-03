/**
 * Rating ドメインの型定義（評価/感想分離後の新モデル）。
 *
 * 旧 review モデルから「評価（1〜5の星のみ）」を切り出した。コメント本文は
 * `types/comment.ts`（podlog#391 系で実装）に分離している。
 *
 * BE 仕様の対応:
 * - `Rating`             … `model.Rating`（POST/PUT/GET mine/MyRatings の各単体レコード）
 * - `MyRatingResult`     … `GET /episodes/{id}/ratings/mine` のレスポンス
 *                          `Rating` と同じ 6 フィールドそのまま（API 設計書 P-3 の
 *                          「Rating オブジェクト形式に統一」方針）
 * - `RatingItem`         … `MyRatingListResult.ratings[]` の各要素
 * - `RatingListResult`   … `GET /users/me/ratings` のレスポンス
 * - `EpisodeRatingResult`… `GET /episodes/{id}/ratings`（公開、集計）
 * - `PodcastRatingResult`… `GET /podcasts/{id}/rating`（公開、軽量集計）
 * - `UserRatingsStatsResult` … `GET /users/{username}/ratings/stats`（公開、サマリー）
 */

/** 評価（API レスポンス全体）。Rating の 6 フィールドそのまま */
export interface Rating {
  id: string;
  user_id: string;
  episode_id: string;
  /** 1〜5 の整数 */
  rating: number;
  created_at: string;
  updated_at: string;
}

/** 評価作成リクエスト */
export interface CreateRatingRequest {
  rating: number;
}

/** 評価更新リクエスト */
export interface UpdateRatingRequest {
  rating: number;
}

/**
 * 自分の評価レスポンス（`GET /episodes/{id}/ratings/mine`）。
 *
 * BE は `model.Rating` をそのまま返すため、`Rating` と同型のエイリアス。
 * （旧 `MyReviewResult` は `Omit<Review, "user_id" | "episode_id">` で
 * 一部フィールドを省いていたが、新 API では「Rating オブジェクト形式に統一」
 * の方針で全フィールド返す。`api-design.md` 参照）
 */
export type MyRatingResult = Rating;

/** 評価一覧に含まれるエピソード情報 */
export interface RatingEpisode {
  id: string;
  title: string;
  podcast_id: string;
  artwork_url?: string;
}

/** 評価一覧に含まれる番組情報 */
export interface RatingPodcast {
  id: string;
  title: string;
  artwork_url?: string;
}

/**
 * 自分の評価一覧の各レコード（`GET /users/me/ratings` のレスポンス内 `ratings[]`）。
 *
 * 旧 `UserReviewItem` から `comment` 列を削除した形。
 */
export interface RatingItem {
  id: string;
  episode: RatingEpisode;
  podcast: RatingPodcast;
  rating: number;
  created_at: string;
  updated_at: string;
}

/** 自分の評価一覧結果（`GET /users/me/ratings`） */
export interface RatingListResult {
  ratings: RatingItem[];
  total: number;
}

/**
 * 星別の件数分布。BE は `map[int]int` を JSON エンコードするため、
 * キーは文字列（`"1"` 〜 `"5"`）として届く。
 */
export type RatingDistribution = Record<string, number>;

/**
 * エピソードの評価集計レスポンス（`GET /episodes/{id}/ratings`、公開）。
 *
 * 旧 `ReviewListResult`（個別レビュー一覧 + 平均）と異なり、新モデルでは
 * **集計値のみ**を返す（個別の感想一覧は `GET /episodes/{id}/comments` で別途取得）。
 */
export interface EpisodeRatingResult {
  average_rating: number;
  total_ratings: number;
  distribution: RatingDistribution;
}

/**
 * ユーザーの評価統計サマリー（`GET /users/{username}/ratings/stats`、公開）。
 *
 * ユーザーページの統計セクション用。個別の評価レコードは返さない。
 */
export interface UserRatingsStatsResult {
  total_ratings: number;
  average_rating: number;
  distribution: RatingDistribution;
}

/**
 * 番組の平均評価（`GET /podcasts/{id}/rating`、公開）。
 *
 * 番組詳細の見出し下に表示する軽量集計。`distribution` は持たない。
 */
export interface PodcastRatingResult {
  average_rating: number;
  total_ratings: number;
}
