/**
 * Server Component / Server Action 用の API クライアント (後方互換レイヤー)。
 *
 * このファイルは現在 22 箇所から呼ばれているため、外部シグネチャは維持したまま
 * 内部実装を新しい 3 層構造 (`apiFetch` + `getAuthHeaders`) に差し替えている。
 *
 * PR B (DAL 層 `lib/data/` の新設) で呼び出し側を移行した後、このファイルは
 * 廃止予定 (podlog-workspace#58 の認証フロー再設計ロードマップ参照)。
 *
 * ポイント:
 * - 認証エラー握りつぶしを除去 (`getAuthHeaders()` が本物のエラーを throw する)
 * - `Content-Type: application/json` を POST/PUT で明示的に付与
 *   (旧 `getServerAuthHeaders` の暗黙挙動を明示化)
 * - リトライ / エラーハンドリング / ベース URL 解決は全て `apiFetch` に委譲
 */
import "server-only";
import { apiFetch } from "./fetch";
import { getAuthHeaders } from "@/lib/auth/getAuthHeaders";

interface ServerFetchOptions {
  /** Next.js の revalidate 秒数。0 でキャッシュなし。 */
  revalidate?: number | false;
  /** Next.js の cache タグ (revalidateTag で無効化するため) */
  tags?: string[];
  /** 認証ヘッダーを付けない (公開 API 用)。true にするとキャッシュが安定する */
  noAuth?: boolean;
}

/**
 * Server Component 用の GET リクエスト。
 */
export async function serverGet<T>(
  path: string,
  options?: ServerFetchOptions,
): Promise<T> {
  const authHeaders = options?.noAuth ? {} : await getAuthHeaders();
  return apiFetch<T>(path, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    next: {
      revalidate: options?.revalidate ?? 0,
      tags: options?.tags,
    },
  });
}

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
    // DELETE はボディを送らないため Content-Type を付けない
    headers: authHeaders,
  });
}
