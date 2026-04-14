/**
 * Server Component / DAL 向け認証ヘッダー取得ヘルパー。
 *
 * Supabase SSR の Cookie から JWT を取り出し、
 * `Authorization: Bearer <token>` ヘッダーを組み立てる。
 *
 * - Cookie がない場合は Supabase クライアントの生成すらスキップ (最速パス)
 * - 認証されていなければ空オブジェクト `{}` を返す
 * - 本物の例外 (Supabase の内部エラー等) は握りつぶさず呼び出し側に投げる
 *
 * 戻り値の型は敢えて `Record<string, string>` に narrow している。
 * `HeadersInit` ユニオン型のままだと呼び出し側で `"Authorization" in headers`
 * の判定が `Headers` インスタンスや配列形式で誤作動するため
 * (frontend.md のコーディング規約参照)。
 *
 * React の `cache()` でラップしているため、同一リクエスト内で複数回呼ばれても
 * Supabase への問い合わせは 1 回しか行われない。
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const getAuthHeaders = cache(
  async (): Promise<Record<string, string>> => {
    const cookieStore = await cookies();
    const hasAuthCookie = cookieStore
      .getAll()
      .some((c) => c.name.startsWith("sb-"));

    // Supabase の認証 Cookie がなければ未ログイン確定。
    // Supabase クライアント生成コスト (getAll() + createServerClient()) を
    // スキップするための最速パス。
    if (!hasAuthCookie) return {};

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return {};

    return { Authorization: `Bearer ${session.access_token}` };
  },
);
