import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/me";
import { ApiRequestError } from "@/types/api";
import { defaultOpenGraph, defaultTwitter } from "@/lib/metadata/shared";
import SettingsClient from "./SettingsClient";
import type { User } from "@/types/user";

const PAGE_TITLE = "設定 | PodLog";
const PAGE_DESCRIPTION = "PodLog のアカウント設定・プロフィール編集はこちら。";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  // 認証必須の個人設定ページ（screens.md の indexable=N）
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
 * /settings ページ (保護ページ)。
 *
 * 認証チェックは middleware (`/settings` は保護パス) で完了済み。
 * page 側では `getMyProfile()` の 401/403/404 catch でフォローアップする
 * (FE 規約: 認証情報の取得は DAL/getViewer に集約し、Server Component から
 * Supabase クライアントを直接呼ばない)。
 */
export default async function SettingsPage() {
  let profile: User;
  try {
    profile = await getMyProfile();
  } catch (err) {
    if (err instanceof ApiRequestError) {
      // 401/403 = セッション失効 → /login
      if (err.status === 401 || err.status === 403) {
        redirect("/login");
      }
      // 404 = プロフィール未設定 → セットアップへ
      if (err.status === 404) {
        redirect("/profile/setup");
      }
    }
    // その他のエラー（500 等）は throw して Next.js エラーページに任せる
    throw err;
  }

  return <SettingsClient profile={profile} />;
}
