import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/me";
import { ApiRequestError } from "@/types/api";
import { defaultOpenGraph, defaultTwitter } from "@/lib/metadata/shared";
import ProfileSetupClient from "./ProfileSetupClient";

const PAGE_TITLE = "プロフィール設定 | PodLog";
const PAGE_DESCRIPTION = "PodLog のプロフィールを設定します。";

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
 *
 * 実装メモ:
 * 他の保護ページ (`settings` / `settings/profile`) の統一テンプレートは
 * 「成功時は画面を描画、catch 内でリダイレクト」パターンだが、本ページは
 * **成功時にリダイレクト** する逆パターンのため、404 を「期待された状態」
 * として扱い catch 内で `return` する。これにより `redirect("/")` が
 * try の外で呼ばれ、NEXT_REDIRECT 特殊 throw を catch に巻き込まないように
 * している。
 */
export default async function ProfileSetupPage() {
  try {
    await getMyProfile();
  } catch (err) {
    if (err instanceof ApiRequestError) {
      // 401/403 = セッション失効 → /login
      if (err.status === 401 || err.status === 403) {
        redirect("/login");
      }
      // 404 = プロフィール未設定 → セットアップ画面を表示 (期待された動作)
      if (err.status === 404) {
        return <ProfileSetupClient />;
      }
    }
    // 500 等のサーバーエラーは throw して Next.js エラーページに任せる
    throw err;
  }

  // ここに到達した = プロフィール設定済み → ホームへ
  redirect("/");
}
