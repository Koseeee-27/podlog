/**
 * Comment ドメインの Data Access Layer (DAL)。
 *
 * 評価/感想分離（podlog-workspace#59）の FE 層対応で追加。旧 `lib/data/reviews.ts`
 * のうち「感想本文（自由記述）」の取得経路をこちらに分離した。
 *
 * GET 系:
 * - `getEpisodeComments(episodeId, ...)` — エピソード感想一覧（公開、`revalidate: 0`）
 * - `getMyComments(...)`                 — 自分の感想一覧（認証必須、`cache: "no-store"`）
 * - `getUserComments(username, ...)`     — ユーザー公開感想一覧（公開、`revalidate: 0`）
 * - `getTimeline(...)`                   — 全ユーザー最新感想（公開、`revalidate: 60` + `["timeline"]` タグ）
 *
 * mutation 系（認証必須）:
 * - `createComment(episodeId, data)` — `POST /episodes/:id/comments`
 * - `updateMyComment(commentId, data)` — `PUT /comments/:id`（commentId をパスに含む）
 * - `deleteMyComment(commentId)` — `DELETE /comments/:id`
 *
 * いずれも Server Action から呼び出される想定。401 は DAL 側では事前判定せず、
 * 呼び出し側の Server Action で `ApiRequestError` を catch して
 * `{ success: false, error }` を返す（FE 規約: 401 ハンドリング統一ルール）。
 *
 * キャッシュ戦略:
 * - 認証必須 DAL は `cache: "no-store"` 明示（Authorization ヘッダー付き fetch を
 *   Next.js fetch キャッシュに乗せない、`frontend.md` 規約）
 * - 公開 DAL のうちエピソード単位 / ユーザー単位は `revalidate: 0`（感想は頻繁に
 *   投稿・更新されるため、リアルタイム性を優先）
 * - タイムラインは `revalidate: 60` + `["timeline"]` タグ。connection が増えても
 *   キャッシュで吸収しつつ、感想投稿時に `revalidateTag("timeline")` で個別無効化可能
 *
 * 設計参考: 既存 `lib/data/ratings.ts` のパターン（rating/review と並ぶ三本目の柱）。
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { getAuthHeaders } from "@/lib/auth/getAuthHeaders";
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  EpisodeCommentListResult,
  UserCommentListResult,
  TimelineResult,
} from "@/types/comment";

/**
 * エピソードの感想一覧を取得する（公開）。
 * `GET /episodes/:id/comments`
 *
 * `revalidate: 0`（キャッシュなし）— 感想はユーザー操作で頻繁に変わるため。
 */
export const getEpisodeComments = cache(
  async (
    episodeId: string,
    limit?: number,
    offset?: number,
  ): Promise<EpisodeCommentListResult> => {
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<EpisodeCommentListResult>(
      `/episodes/${encodeURIComponent(episodeId)}/comments${query}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      },
    );
  },
);

/**
 * 自分の感想一覧を取得する（認証必須）。
 * `GET /users/me/comments`
 *
 * 未ログイン時は `getAuthHeaders()` が空オブジェクトを返すが、DAL 側では事前判定
 * せず `apiFetch` にそのまま投げる。バックエンドは未ログインなら 401 を返す。
 * 呼び出し側で `ApiRequestError` を catch して未ログインを判別する（FE 規約）。
 *
 * Authorization ヘッダー付きの呼び出しなので `cache: "no-store"` を明示する
 * （`frontend.md` 規約: JWT 付き fetch を Next.js キャッシュに乗せない）。
 */
export const getMyComments = cache(
  async (limit?: number, offset?: number): Promise<UserCommentListResult> => {
    const authHeaders = await getAuthHeaders();
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<UserCommentListResult>(`/users/me/comments${query}`, {
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
 * 指定ユーザーの公開感想一覧を取得する（公開）。
 * `GET /users/:username/comments`
 *
 * `revalidate: 0`（キャッシュなし）— ユーザーが感想を投稿するたびに反映される
 * べきで、エピソード単位の `getEpisodeComments` と同じ流儀。
 */
export const getUserComments = cache(
  async (
    username: string,
    limit?: number,
    offset?: number,
  ): Promise<UserCommentListResult> => {
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<UserCommentListResult>(
      `/users/${encodeURIComponent(username)}/comments${query}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      },
    );
  },
);

/**
 * 全ユーザーの最新感想（タイムライン）を取得する（公開）。
 * `GET /timeline`
 *
 * `revalidate: 60` + `["timeline"]` タグ。投稿時に `revalidateTag("timeline")`
 * で個別無効化可能。短期キャッシュで再訪時の負荷を抑える。
 */
export const getTimeline = cache(
  async (limit?: number, offset?: number): Promise<TimelineResult> => {
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<TimelineResult>(`/timeline${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60, tags: ["timeline"] },
    });
  },
);

/**
 * エピソードに感想を新規投稿する（認証必須）。
 * `POST /episodes/:id/comments`
 *
 * 1ユーザー1エピソード=複数件可（rating と異なり 409 はない）。DAL 側では 401 を
 * 事前判定せず `apiFetch` にそのまま投げる。呼び出し側（Server Action）で
 * `ApiRequestError` を catch して扱う（FE 規約）。
 */
export async function createComment(
  episodeId: string,
  data: CreateCommentRequest,
): Promise<Comment> {
  const authHeaders = await getAuthHeaders();
  return apiFetch<Comment>(
    `/episodes/${encodeURIComponent(episodeId)}/comments`,
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
 * 自分の感想を更新する（認証必須）。
 * `PUT /comments/:id`（episodeId ではなく commentId をパスに含む点に注意）。
 *
 * 他ユーザーの感想を更新しようとすると BE が 403 を返す。403 のハンドリングは UI 層
 * の責務（`frontend.md`「ドメイン固有エラーは UI 層で扱う」規約）。
 */
export async function updateMyComment(
  commentId: string,
  data: UpdateCommentRequest,
): Promise<Comment> {
  const authHeaders = await getAuthHeaders();
  return apiFetch<Comment>(`/comments/${encodeURIComponent(commentId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(data),
  });
}

/**
 * 自分の感想を削除する（認証必須）。
 * `DELETE /comments/:id`（episodeId ではなく commentId をパスに含む点に注意）。
 *
 * 現状の PodLog API は DELETE でリクエストボディを送らないため `Content-Type` は
 * 付けない。BE は 204 No Content を返す（`apiFetch<void>` で受ける）。
 */
export async function deleteMyComment(commentId: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  await apiFetch<void>(`/comments/${encodeURIComponent(commentId)}`, {
    method: "DELETE",
    headers: authHeaders,
  });
}
