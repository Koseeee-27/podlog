import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

/**
 * プロフィールが存在するかバックエンド API で確認する。
 * 存在すれば true、404 なら false を返す。
 * API エラー時は安全側に倒して true（ホームへ遷移）を返す。
 */
async function hasProfile(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 404) return false;
    return res.ok;
  } catch {
    // ネットワークエラー等の場合はホームへ遷移させる
    return true;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // セッション交換後にプロフィールの存在を確認する
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const profileExists = await hasProfile(session.access_token);
        if (!profileExists) {
          return NextResponse.redirect(`${origin}/profile/setup`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // エラー時はログインページにリダイレクト
  return NextResponse.redirect(`${origin}/login`);
}
