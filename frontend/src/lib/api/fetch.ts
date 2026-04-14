/**
 * 純粋な HTTP クライアント (Server Component 専用)。
 *
 * 責務:
 * - Go バックエンドへの HTTP リクエスト発行
 * - GET のみリトライ (Neon コールドスタート対策で最大 1 回)
 * - エラー時に {@link ApiRequestError} を throw
 *
 * 非責務:
 * - 認証ヘッダーの構築 (呼び出し側で `getAuthHeaders()` などを使って組み立てる)
 * - `Content-Type` の暗黙付与 (呼び出し側で必要に応じて指定する)
 *
 * この設計により、認証ロジックと HTTP 層を分離し、
 * 呼び出し側が必要な場面でのみ認証ヘッダーを付けられるようにする。
 */
import "server-only";
import { ApiRequestError } from "@/types/api";

/**
 * サーバー側の API ベース URL。
 * INTERNAL_API_BASE_URL (サーバー間通信用) を優先し、
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
 * apiFetch に渡す init オプション。
 * 標準の RequestInit に加えて Next.js の fetch 拡張 (next.revalidate / next.tags) を受け付ける。
 */
export type ApiFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

/**
 * Go バックエンド API への HTTP リクエストを発行する。
 *
 * - GET の場合、ネットワークエラー / 500 以上のレスポンスは 1 回だけリトライする (1 秒遅延)
 * - POST/PUT/DELETE はリトライしない (冪等でないため)
 * - 200 系以外のレスポンスは {@link ApiRequestError} として throw する
 * - 204 No Content は `undefined` として返す (T が void のときに利用)
 *
 * **注意**: リトライ時は `init` をそのまま `fetch()` に再利用する。呼び出し側が
 * `body` に ReadableStream を渡すと 2 回目の `fetch()` で「already read」になる。
 * 現状の呼び出し経路 (Server Action から DAL 経由で呼ばれる mutation) は
 * `JSON.stringify` 済み文字列しか渡さないため問題ないが、将来ストリーム body を
 * 渡す場合はリトライ対象を GET 限定の現設計と整合させること (非 GET はリトライ
 * しない設計なので body 問題は発生しない)。
 *
 * @throws {ApiRequestError} レスポンスが 2xx 以外の場合
 * @throws {Error} fetch 自体がネットワークエラーで失敗した場合
 */
export async function apiFetch<T>(
  path: string,
  init?: ApiFetchInit,
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const method = (init?.method ?? "GET").toUpperCase();
  const isGet = method === "GET";
  // 非 GET は maxAttempts = 1 なので、下の for ループの `continue` 分岐
  // (isGet && attempt === 0 の条件付き) には到達しない。冪等でない POST/PUT/DELETE
  // をリトライしない設計のため。
  const maxAttempts = isGet ? 2 : 1;

  let response: Response | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      response = await fetch(url, init);
    } catch (err) {
      lastError = err;
      response = undefined;
      if (isGet && attempt === 0) {
        // 注意: path にクエリ文字列が含まれる場合、将来的に秘匿情報が混じる設計に
        // なったらここでマスクすること。現状の /users/me 等のパスは PII を含まない。
        console.warn(`[apiFetch] ${path} network error, retrying...`, err);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }

    // 5xx は GET のみリトライ対象
    if (isGet && response.status >= 500 && attempt === 0) {
      console.warn(
        `[apiFetch] ${path} returned ${response.status}, retrying...`,
      );
      // body を消費してコネクションを解放する
      await response.body?.cancel().catch(() => undefined);
      response = undefined;
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    break;
  }

  if (!response) {
    // リトライが全て失敗した場合、最後のエラーを投げる
    throw lastError ?? new Error(`[apiFetch] ${path} failed without response`);
  }

  if (!response.ok) {
    // catch 時のデフォルトを空オブジェクトにし、`|| "Request failed"` フォールバック
    // を活かす (こうしておくことで `{ error: "Unknown error" }` のようなデッドコードに
    // ならない)。
    const body = await response.json().catch(() => ({}));
    throw new ApiRequestError(
      response.status,
      body?.error || "Request failed",
    );
  }

  // 204 No Content はボディなし (DELETE 等)
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
