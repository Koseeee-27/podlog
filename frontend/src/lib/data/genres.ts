/**
 * Genre ドメインの Data Access Layer (DAL)。
 *
 * Server Component から呼ぶ GET 系データ取得関数を集約する。
 *
 * - `import "server-only"` で Client Component からの import を防ぐ
 * - React の `cache()` でラップし、同一リクエスト内での重複取得を防ぐ
 * - エンドポイント URL・`revalidate` 戦略・型指定を DAL 側に閉じ込め、
 *   呼び出し側は URL を書かずドメイン関数を呼ぶだけでよい
 *
 * `/genres` は完全な公開 API のため、Authorization ヘッダーは付けず
 * `next: { revalidate: 300 }` で 5 分キャッシュする。
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import type { GenreListResponse } from "@/types/genre";

/**
 * ジャンル一覧を取得する (公開)。
 * revalidate: 300 秒 (ジャンルマスタは頻繁に変わらないため)。
 */
export const getGenres = cache(async (): Promise<GenreListResponse> => {
  return apiFetch<GenreListResponse>("/genres", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 300 },
  });
});
