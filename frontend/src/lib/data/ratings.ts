/**
 * Rating ドメインの Data Access Layer (DAL)。
 *
 * 評価/感想分離（podlog-workspace#59）の FE 層対応で追加。旧 `lib/data/reviews.ts`
 * から評価レイヤーのみを切り出した形。コメント本文は `lib/data/comments.ts`
 * （podlog#391 系で実装）に分離している。
 *
 * GET 系:
 * - `getMyRating`           — 自分のエピソード評価 (認証必須)
 * - `getEpisodeRating`      — エピソード集計（平均・件数・分布）(公開)
 * - `getPodcastRating`      — 番組平均評価 (公開)。`lib/data/podcasts.ts` から
 *                             引っ越した（旧 `OldPodcastRatingResult` から
 *                             新 `PodcastRatingResult` に型を切り替え）
 * - `getUserRatingsStats`   — ユーザー評価統計サマリー (公開)
 * - `getMyRatings`          — 自分の評価一覧 (認証必須)
 *
 * mutation 系 (認証必須):
 * - `createRating` / `updateMyRating` / `deleteMyRating`
 *   いずれも Server Action から呼び出される想定。401 は DAL 側では事前判定
 *   せず、呼び出し側の Server Action で `ApiRequestError` を catch する
 *   （FE 規約: 401 ハンドリング統一ルール）。
 *
 * キャッシュ戦略:
 * - 認証必須 DAL は `cache: "no-store"` 明示（Authorization ヘッダー付き
 *   fetch を Next.js fetch キャッシュに乗せない）
 * - 公開 DAL のうち集計系（episode/user）は `revalidate: 0`（評価は頻繁に変わる）
 * - 番組単位の集計（podcast）は短期キャッシュ（`revalidate: 60`）
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { getAuthHeaders } from "@/lib/auth/getAuthHeaders";
import type {
  Rating,
  MyRatingResult,
  RatingListResult,
  CreateRatingRequest,
  UpdateRatingRequest,
  EpisodeRatingResult,
  PodcastRatingResult,
  UserRatingsStatsResult,
} from "@/types/rating";

/**
 * 自分のエピソード評価を取得する (認証必須)。
 * `GET /episodes/:id/ratings/mine`
 *
 * 未ログイン時は `getAuthHeaders()` が空オブジェクトを返すが、DAL 側では
 * 事前判定せず `apiFetch` にそのまま投げる。バックエンドは未ログインなら
 * 401、ログイン済みでも未投稿なら 404 を返す。呼び出し側で
 * `ApiRequestError` を catch して未ログイン / 未投稿を判別する。
 *
 * Authorization ヘッダー付きの呼び出しなので `cache: "no-store"` を明示する。
 */
export const getMyRating = cache(
  async (episodeId: string): Promise<MyRatingResult> => {
    const authHeaders = await getAuthHeaders();
    return apiFetch<MyRatingResult>(
      `/episodes/${encodeURIComponent(episodeId)}/ratings/mine`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        cache: "no-store",
      },
    );
  },
);

/**
 * エピソードの評価集計（平均・件数・分布）を取得する (公開)。
 * `GET /episodes/:id/ratings`
 *
 * `revalidate: 0` (キャッシュなし) — 評価はユーザー操作で頻繁に変わるため。
 */
export const getEpisodeRating = cache(
  async (episodeId: string): Promise<EpisodeRatingResult> => {
    return apiFetch<EpisodeRatingResult>(
      `/episodes/${encodeURIComponent(episodeId)}/ratings`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      },
    );
  },
);

/**
 * 番組の平均評価を取得する (公開)。
 * `GET /podcasts/:id/rating`
 *
 * 番組詳細の見出し下に出る軽量集計。`lib/data/podcasts.ts` から本ファイルに
 * 引っ越したうえで、戻り型を `PodcastRatingResult`（`total_ratings` 形）に
 * 切り替えている（podlog#390 で BE が新型に変わったが FE が追従しておらず
 * `result.total_reviews` が undefined になっていた表示破綻を併せて修正）。
 *
 * `revalidate: 60` 秒。集計値は短期キャッシュで再訪時の負荷を抑える。
 */
export const getPodcastRating = cache(
  async (id: string): Promise<PodcastRatingResult> => {
    return apiFetch<PodcastRatingResult>(
      `/podcasts/${encodeURIComponent(id)}/rating`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60 },
      },
    );
  },
);

/**
 * ユーザーの評価統計サマリーを取得する (公開)。
 * `GET /users/:username/ratings/stats`
 *
 * ユーザーページの統計セクション用。個別の評価レコードは返さない。
 * `revalidate: 60` 秒。
 */
export const getUserRatingsStats = cache(
  async (username: string): Promise<UserRatingsStatsResult> => {
    return apiFetch<UserRatingsStatsResult>(
      `/users/${encodeURIComponent(username)}/ratings/stats`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60 },
      },
    );
  },
);

/**
 * 自分の評価一覧を取得する (認証必須)。
 * `GET /users/me/ratings`
 *
 * 設定ページ等での確認・整理用途。`cache: "no-store"`。
 */
export const getMyRatings = cache(
  async (limit?: number, offset?: number): Promise<RatingListResult> => {
    const authHeaders = await getAuthHeaders();
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<RatingListResult>(`/users/me/ratings${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      cache: "no-store",
    });
  },
);

/**
 * エピソードに評価を新規投稿する (認証必須)。
 * `POST /episodes/:id/ratings`
 *
 * DAL 側では 401 を事前判定せず `apiFetch` にそのまま投げる。呼び出し側
 * (Server Action) で `ApiRequestError` を catch して扱う (FE 規約)。
 *
 * 既に投稿済みの場合は BE が 409 を返すので、Server Action 側で 409 を
 * 検知したら `updateMyRating` にフォールバックする運用。
 */
export async function createRating(
  episodeId: string,
  data: CreateRatingRequest,
): Promise<Rating> {
  const authHeaders = await getAuthHeaders();
  return apiFetch<Rating>(`/episodes/${encodeURIComponent(episodeId)}/ratings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(data),
  });
}

/**
 * 自分のエピソード評価を更新する (認証必須)。
 * `PUT /episodes/:id/ratings/mine`
 */
export async function updateMyRating(
  episodeId: string,
  data: UpdateRatingRequest,
): Promise<Rating> {
  const authHeaders = await getAuthHeaders();
  return apiFetch<Rating>(
    `/episodes/${encodeURIComponent(episodeId)}/ratings/mine`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(data),
    },
  );
}

/**
 * 自分のエピソード評価を削除する (認証必須)。
 * `DELETE /episodes/:id/ratings/mine`
 *
 * 現状の PodLog API は DELETE でリクエストボディを送らないため
 * `Content-Type` は付けない。
 */
export async function deleteMyRating(episodeId: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  await apiFetch<void>(
    `/episodes/${encodeURIComponent(episodeId)}/ratings/mine`,
    {
      method: "DELETE",
      headers: authHeaders,
    },
  );
}
