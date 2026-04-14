import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/me";
import { ApiRequestError } from "@/types/api";
import SettingsClient from "./SettingsClient";
import type { User } from "@/types/user";

/**
 * /settings ページ (保護ページ)。
 *
 * 認証チェックは middleware (`/settings` は保護パス) で完了済み。
 * page 側では `getMyProfile()` の 401/403 catch でフォローアップする
 * (FE 規約: 認証情報の取得は DAL/getViewer に集約し、Server Component から
 * Supabase クライアントを直接呼ばない)。
 */
export default async function SettingsPage() {
  let profile: User | null = null;
  try {
    profile = await getMyProfile();
  } catch (err) {
    if (err instanceof ApiRequestError) {
      // 401/403 = セッション失効 → /login (admin/page.tsx と挙動を揃える)
      if (err.status === 401 || err.status === 403) {
        redirect("/login");
      }
      // 404 = プロフィール未設定 → null のまま表示
      if (err.status === 404) {
        // fall through
      } else {
        // その他のエラー（500 等）は throw
        throw err;
      }
    } else {
      throw err;
    }
  }

  return <SettingsClient initialProfile={profile} />;
}
