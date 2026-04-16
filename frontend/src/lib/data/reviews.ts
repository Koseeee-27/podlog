/**
 * Review ドメインの Data Access Layer (DAL)。
 *
 * GET 系:
 * - `getReviewsByEpisodeId`: エピソードのレビュー一覧 (公開)。
 *   ユーザー操作で頻繁に変わるため `revalidate: 0` (キャッシュなし)
 * - `getMyReview`: 自分のレビュー (認証必須)。401/404 は呼び出し側で
 *   `ApiRequestError` を catch して未ログイン or 未投稿として扱う
 *   (FE 規約: 401 ハンドリング統一ルール)
 *
 * mutation 系 (認証必須):
 * - `createReview` / `updateMyReview` / `deleteMyReview`
 *   いずれも Server Action から呼び出される想定。401 は DAL 側では事前判定
 *   せず、呼び出し側の Server Action で `ApiRequestError` を catch して
 *   `{ success: false, error }` 形式でフォームに返す (FE 規約)。
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { getAuthHeaders } from "@/lib/auth/getAuthHeaders";
import type {
  ReviewListResult,
  MyReviewResult,
  Review,
  CreateReviewRequest,
  UpdateReviewRequest,
} from "@/types/review";

/**
 * エピソードのレビュー一覧を取得する (公開)。
 * `revalidate: 0` (キャッシュなし) — レビューはユーザー操作で頻繁に変わるため。
 */
export const getReviewsByEpisodeId = cache(
  async (
    episodeId: string,
    limit?: number,
    offset?: number,
  ): Promise<ReviewListResult> => {
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<ReviewListResult>(
      `/episodes/${encodeURIComponent(episodeId)}/reviews${query}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      },
    );
  },
);

/**
 * 自分のエピソードレビューを取得する (認証必須)。
 *
 * 未ログイン時は `getAuthHeaders()` が空オブジェクトを返すが、DAL 側では
 * 事前判定せず `apiFetch` にそのまま投げる。バックエンドは未ログインなら
 * 401、ログイン済みでも未投稿なら 404 を返す。呼び出し側で
 * `ApiRequestError` を catch して未ログイン / 未投稿を判別する。
 *
 * Authorization ヘッダー付きの呼び出しなので `cache: "no-store"` を明示する。
 */
export const getMyReview = cache(
  async (episodeId: string): Promise<MyReviewResult> => {
    const authHeaders = await getAuthHeaders();
    return apiFetch<MyReviewResult>(
      `/episodes/${encodeURIComponent(episodeId)}/reviews/mine`,
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
 * エピソードにレビューを新規投稿する (認証必須)。
 * `POST /episodes/:id/reviews`。
 *
 * DAL 側では 401 を事前判定せず `apiFetch` にそのまま投げる。呼び出し側
 * (Server Action) で `ApiRequestError` を catch して扱う (FE 規約)。
 */
export async function createReview(
  episodeId: string,
  data: CreateReviewRequest,
): Promise<Review> {
  const authHeaders = await getAuthHeaders();
  return apiFetch<Review>(
    `/episodes/${encodeURIComponent(episodeId)}/reviews`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(data),
    },
  );
}

/**
 * 自分のエピソードレビューを更新する (認証必須)。
 * `PUT /episodes/:id/reviews/mine`。
 */
export async function updateMyReview(
  episodeId: string,
  data: UpdateReviewRequest,
): Promise<Review> {
  const authHeaders = await getAuthHeaders();
  return apiFetch<Review>(
    `/episodes/${encodeURIComponent(episodeId)}/reviews/mine`,
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
 * 自分のエピソードレビューを削除する (認証必須)。
 * `DELETE /episodes/:id/reviews/mine`。
 *
 * 現状の PodLog API は DELETE でリクエストボディを送らないため
 * `Content-Type` は付けない。
 */
export async function deleteMyReview(episodeId: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  await apiFetch<void>(
    `/episodes/${encodeURIComponent(episodeId)}/reviews/mine`,
    {
      method: "DELETE",
      headers: authHeaders,
    },
  );
}
