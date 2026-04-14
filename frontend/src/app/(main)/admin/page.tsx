import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/me";
import { ApiRequestError } from "@/types/api";
import AdminClient from "./AdminClient";
import type { User } from "@/types/user";

/**
 * /admin ページ (保護ページ)。
 *
 * 認証チェックは middleware (`/admin` は保護パス) で完了済み。
 * page 側では `getMyProfile()` の 401/403/404 catch でフォローアップする
 * (FE 規約: 認証情報の取得は DAL/getViewer に集約し、Server Component から
 * Supabase クライアントを直接呼ばない)。
 */
export default async function AdminPage() {
  let profile: User | null = null;
  try {
    profile = await getMyProfile();
  } catch (err) {
    // 401/403 はログインへ、404 はプロフィール未設定
    if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
      redirect("/login");
    }
    if (err instanceof ApiRequestError && err.status === 404) {
      redirect("/profile/setup");
    }
    // その他のエラー（500等）は throw して Next.js エラーページに任せる
    throw err;
  }

  // 管理者でなければホームにリダイレクト（認証済みだが権限不足）
  if (!profile?.is_admin) {
    redirect("/");
  }

  return <AdminClient />;
}
