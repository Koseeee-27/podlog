/**
 * Server Component 用の API クライアント。
 * Server Component から Go バックエンドの API を呼び出すためのユーティリティ。
 *
 * ブラウザ用の client.ts との違い:
 * - Supabase のサーバー側クライアントから JWT トークンを取得する
 * - サーバー専用の API_BASE_URL 環境変数を参照する（SSR 時はブラウザから直接ではなくサーバー間通信になるため）
 * - Next.js の fetch キャッシュオプションを指定できる
 */
import { createClient } from "@/lib/supabase/server";
import { ApiRequestError } from "@/types/api";

/**
 * サーバー側の API ベース URL。
 * INTERNAL_API_BASE_URL（サーバー間通信用）が設定されていればそちらを優先し、
 * なければ NEXT_PUBLIC_API_BASE_URL にフォールバックする。
 */
function getApiBaseUrl(): string {
  return (
    process.env.INTERNAL_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8080/api/v1"
  );
}

/**
 * サーバー側で認証ヘッダーを構築する。
 * Supabase のサーバークライアントからセッションの access_token を取得する。
 */
async function getServerAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch {
    // 認証情報が取れない場合は未認証のまま続行
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new ApiRequestError(response.status, body.error || "Request failed");
  }
  return response.json();
}

interface ServerFetchOptions {
  /** Next.js の revalidate 秒数。0 でキャッシュなし。 */
  revalidate?: number | false;
  /** Next.js の cache タグ（revalidateTag で無効化するため） */
  tags?: string[];
  /** 認証ヘッダーを付けない（公開 API 用）。true にするとキャッシュが安定する */
  noAuth?: boolean;
}

/**
 * Server Component 用の GET リクエスト。
 */
export async function serverGet<T>(
  path: string,
  options?: ServerFetchOptions,
): Promise<T> {
  const headers = options?.noAuth
    ? { "Content-Type": "application/json" }
    : await getServerAuthHeaders();
  const baseUrl = getApiBaseUrl();

  // サーバーエラー（500等）時に1回リトライ（Neon コールドスタート対策）
  const doFetch = () =>
    fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers,
      next: {
        revalidate: options?.revalidate ?? 0,
        tags: options?.tags,
      },
    });

  // 最大2回（初回 + リトライ1回）に制限。
  // handleResponse はループ外で1回だけ呼ぶ（4xx でのリトライ防止・body 二重消費防止）
  let response: Response | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await doFetch();
    } catch (err) {
      lastError = err;
      if (attempt === 0) {
        console.warn(`[serverGet] ${path} failed, retrying...`, err);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      break;
    }

    if (response.status >= 500 && attempt === 0) {
      console.warn(`[serverGet] ${path} returned ${response.status}, retrying...`);
      if (response.body) {
        await response.body.cancel().catch(() => undefined);
      }
      response = undefined;
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    break;
  }

  if (response) return handleResponse<T>(response);
  throw lastError;
}
