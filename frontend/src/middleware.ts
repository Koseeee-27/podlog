import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 以下で始まるパス以外のすべてのリクエストにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico (ファビコン)
     * - monitoring (Sentry の tunnelRoute 転送先。middleware の認証処理を通すと
     *   ログイン済みユーザーがエラー送信するたびに supabase.auth.getSession() が
     *   呼ばれ、Supabase への不要なアクセスが発生するため除外する)
     * - sitemap.xml / robots.txt (Next.js File Convention で生成される SEO 用
     *   静的アセット。クローラからの低頻度アクセスごとに Supabase を叩くのは
     *   無駄なコストになるため、monitoring と同じ流儀で除外する)
     * - public フォルダのアセット
     */
    "/((?!_next/static|_next/image|favicon.ico|monitoring|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
