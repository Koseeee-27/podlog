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
     * - public フォルダのアセット
     */
    "/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
