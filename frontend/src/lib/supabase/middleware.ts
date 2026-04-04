import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 認証が必要なパスの定義（フルオープン型: 書き込み系のみ認証必須）
const PROTECTED_PATHS = ["/record", "/profile/setup", "/settings", "/admin"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

/**
 * Supabase セッションの更新と認証チェックを行う Middleware。
 *
 * 公開ページ: Cookie があればトークンリフレッシュのみ行い、getUser() は呼ばない（高速）
 * 認証必須ページ: getUser() で認証検証 + 未認証ならリダイレクト
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // env が未設定の場合はそのまま通す（ビルド時やテスト時）
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  // /signup は /login にリダイレクト（Google 認証のみのため統合）
  if (request.nextUrl.pathname === "/signup") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const isProtected = isProtectedPath(request.nextUrl.pathname);

  // 公開ページかつ認証 Cookie がなければ、Supabase クライアント生成自体をスキップ
  const hasAuthCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-")
  );
  if (!isProtected && !hasAuthCookie) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // 認証必須ページ: getUser() でセッション検証 + リダイレクト判定
  if (isProtected) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  // 公開ページ（Cookie あり）: getSession() でトークンリフレッシュのみ
  // getSession() は Cookie を読んでリフレッシュするが、Supabase サーバーへの通信は不要
  if (!isProtected && hasAuthCookie) {
    await supabase.auth.getSession();
  }

  // 認証済みユーザーが /login にアクセスしたらトップへ
  if (request.nextUrl.pathname === "/login") {
    const hasSession = request.cookies.getAll().some(
      (c) => c.name.startsWith("sb-")
    );
    if (hasSession) {
      // getUser() で正確に判定（/login → / のリダイレクトは頻度が低いのでコスト許容）
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        const redirectResponse = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie);
        });
        return redirectResponse;
      }
    }
  }

  return supabaseResponse;
}
