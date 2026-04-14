import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/me";
import { ApiRequestError } from "@/types/api";
import ProfileSetupClient from "./ProfileSetupClient";

/**
 * /profile/setup ページ (保護ページ)。
 *
 * 認証チェックは middleware (`/profile/setup` は保護パス) で完了済み。
 * page 側では `getMyProfile()` の 401/403/404 catch でフォローアップする
 * (FE 規約: 認証情報の取得は DAL/getViewer に集約し、Server Component から
 * Supabase クライアントを直接呼ばない)。
 *
 * 挙動:
 * - 200 (プロフィール設定済み): `/` にリダイレクト
 * - 404 (プロフィール未設定): セットアップフォームを表示
 * - 401/403 (セッション失効): `/login` にリダイレクト
 * - その他 (500 等): throw して Next.js エラーページに委譲
 */
export default async function ProfileSetupPage() {
  // プロフィール設定済みなら / にリダイレクトする (try 内の redirect は
  // Next.js の NEXT_REDIRECT 特殊 throw となり catch で再 throw される)
  try {
    await getMyProfile();
    redirect("/");
  } catch (err) {
    if (err instanceof ApiRequestError) {
      // 401/403 = セッション失効 → /login
      if (err.status === 401 || err.status === 403) {
        redirect("/login");
      }
      // 404 = プロフィール未設定 → fall through してセットアップ画面を表示
      if (err.status === 404) {
        // fall through
      } else {
        // 500 等のサーバーエラー
        throw err;
      }
    } else {
      // redirect() の特殊 throw (NEXT_REDIRECT) や予期しない例外は再 throw
      throw err;
    }
  }

  return <ProfileSetupClient />;
}
