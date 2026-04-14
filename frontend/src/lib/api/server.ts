/**
 * Server Action 用の mutation API クライアント (後方互換レイヤー)。
 *
 * GET 系のデータ取得は `lib/data/*` の DAL に移行済み (podlog#331)。
 * このファイルには Server Action から呼ぶ POST / PUT / DELETE のみが残っている。
 *
 * 後続 PR (PR C) で `serverPost` / `serverPut` / `serverDelete` も `apiFetch`
 * ベースの薄いラッパーを廃止し、各 Server Action 内で直接 `apiFetch` +
 * `getAuthHeaders` を呼ぶ形に置き換える予定 (podlog-workspace#58 参照)。
 *
 * ポイント:
 * - `Content-Type: application/json` を POST/PUT で明示的に付与
 * - リトライ / エラーハンドリング / ベース URL 解決は全て `apiFetch` に委譲
 */
import "server-only";
import { apiFetch } from "./fetch";
import { getAuthHeaders } from "@/lib/auth/getAuthHeaders";

/**
 * Server Component / Server Action 用の POST リクエスト。
 */
export async function serverPost<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  return apiFetch<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Server Component / Server Action 用の PUT リクエスト。
 */
export async function serverPut<T>(path: string, body?: unknown): Promise<T> {
  const authHeaders = await getAuthHeaders();
  return apiFetch<T>(path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Server Action 用の DELETE リクエスト。
 */
export async function serverDelete(path: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  await apiFetch<void>(path, {
    method: "DELETE",
    // 現状の PodLog API は DELETE でリクエストボディを送らないため
    // Content-Type は付けない。将来 DELETE で body を送る API が
    // 追加されたら個別に Content-Type を指定すること。
    headers: authHeaders,
  });
}
