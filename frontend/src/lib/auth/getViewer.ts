/**
 * Server Component で利用する「現在の閲覧者」解決ヘルパー。
 *
 * Supabase の認証状態と PodLog のユーザープロフィール (Go バックエンドの
 * `/users/me`) を組み合わせて、以下の 3 状態を判別 union で返す:
 *
 * - `guest`          : 未ログイン (Cookie がない / JWT が無効 / 401)
 * - `no_profile`     : ログインしているが PodLog にプロフィール未作成 (404)
 *                      → 初回ログイン時に `/signup` へ誘導するために使う
 * - `authenticated`  : ログイン済み + プロフィール有り
 *
 * 設計の要点:
 * - `getAuthHeaders()` → `apiFetch<User>("/users/me")` の 1 段階構造。
 *   「Supabase で user を取る → API で profile を取る」の 2 段階は採用しない
 *   (ネットワークラウンドトリップが増えるだけで、バックエンドの JWT 検証が
 *    結局もう 1 回走るため)。
 * - 500 番台などの本物のエラーは握りつぶさず呼び出し側に投げる。
 * - `cache()` でラップしているため、Server Component ツリー内で何度呼ばれても
 *   バックエンドへのリクエストは 1 回で済む。
 * - Authorization ヘッダー付き fetch は `cache: "no-store"` を明示して、
 *   別ユーザーのレスポンスが Next.js の fetch キャッシュに混ざらないようにする。
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { getAuthHeaders } from "./getAuthHeaders";
import { ApiRequestError } from "@/types/api";
import type { User } from "@/types/user";

export type Viewer =
  | { status: "guest" }
  | { status: "no_profile" }
  | { status: "authenticated"; profile: User };

/**
 * `Viewer` のうち `authenticated` 状態のみに絞った narrowed 型。
 *
 * 「認証必須 + プロフィール設定済み」を保証する関数（例:
 * `lib/actions/comment.ts::ensureAuthenticated`）の戻り値型として使う。呼び出し側
 * で `viewer.profile.id` 等にアクセスする際、`viewer.status === "authenticated"`
 * の再判定が不要になる。
 *
 * 横展開メモ: rating / review の Server Action にも同様の認証チェックパターンが
 * ベタ書きされているが、戻り値型を narrow する形ではない。別 Issue で
 * `ensureAuthenticated` を共通ヘルパー化する際に本型を使う想定。
 */
export type AuthenticatedViewer = Extract<Viewer, { status: "authenticated" }>;

/**
 * 現在の閲覧者を `guest` / `no_profile` / `authenticated` の判別 union で返す。
 * `getAuthHeaders()` → `/users/me` の 1 段階で解決し、React `cache()` でリクエスト
 * スコープメモ化する。詳細はモジュール冒頭の JSDoc を参照。
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const headers = await getAuthHeaders();

  // `Authorization` キーが無ければ Supabase に未ログイン = guest 確定。
  // 型を Record<string, string> に narrow しているため
  // `in` 演算子を安全に使える (HeadersInit のままだと誤作動する)。
  if (!("Authorization" in headers)) {
    return { status: "guest" };
  }

  try {
    // Authorization ヘッダー付き fetch に `cache: "no-store"` を明示する。
    // `next: { revalidate }` と同時指定はしない (Next.js 16 では併用時に
    // 警告が出る場合があり、また別ユーザーのレスポンスが Next.js の fetch
    // キャッシュに混ざるリスクを確実に避けるため)。
    const profile = await apiFetch<User>("/users/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      cache: "no-store",
    });
    return { status: "authenticated", profile };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      // JWT が無効 / 期限切れ。guest として扱う
      if (err.status === 401) return { status: "guest" };
      // ログイン済みだがプロフィール未作成 (初回ログイン直後)
      if (err.status === 404) return { status: "no_profile" };
    }
    // 500 など予期しないエラーは呼び出し側に投げて Error Boundary に委ねる
    throw err;
  }
});
