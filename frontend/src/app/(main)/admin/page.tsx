import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/me";
import { ApiRequestError } from "@/types/api";
import { defaultOpenGraph, defaultTwitter } from "@/lib/metadata/shared";
import AdminClient from "./AdminClient";
import type { User } from "@/types/user";

const PAGE_TITLE = "管理画面 | PodLog";
const PAGE_DESCRIPTION = "PodLog の管理者向け機能。";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  // 管理者限定ページ（screens.md の indexable=N）
  robots: { index: false, follow: false },
  // openGraph / twitter は shallow merge で layout の値が継承されるため、
  // ページ固有の og:title / og:description にするには各ページで spread が必要
  openGraph: {
    ...defaultOpenGraph,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  twitter: {
    ...defaultTwitter,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

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
