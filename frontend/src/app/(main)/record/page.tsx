import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/me";
import { ApiRequestError } from "@/types/api";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import PodcastSearchSection from "./PodcastSearchSection";
import RecentEpisodesSection from "./RecentEpisodesSection";
import { RecentEpisodesSkeleton } from "./skeletons";

export const metadata: Metadata = {
  title: "記録する | PodLog",
  description: "聴いたラジオを記録します。",
  // 認証必須ページ（screens.md の indexable=N）
  robots: { index: false, follow: false },
};

// 認証ユーザーごとにデータが異なるため、静的生成をスキップする
export const dynamic = "force-dynamic";

/**
 * /record ページ（保護ページ）。
 *
 * 認証チェックは middleware (`/record` は保護パス) で完了済み。
 * page 側では `getMyProfile()` の 401/403/404 catch でフォローアップする
 * (FE 規約: 認証情報の取得は DAL/getViewer に集約し、Server Component から
 * Supabase クライアントを直接呼ばない)。
 *
 * 他の 4 保護ページ (settings/admin/settings/profile/profile/setup) と
 * 同じ catch パターンに統一:
 * - 401/403 (セッション失効) → /login
 * - 404 (プロフィール未設定) → /profile/setup
 * - 500 系 → throw
 *
 * 検索セクション（Client）と新着エピソードセクション（Server / Suspense）は
 * 対等な兄弟として配置する。新着エピソードの取得は Suspense で分離し、
 * ユーザーはページ遷移後すぐに検索バーを操作できる。
 */
export default async function RecordPage() {
  // プロフィール確認（認証チェックは middleware で完了済み）
  try {
    await getMyProfile();
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
    // 500 等のサーバーエラー、または redirect() の特殊 throw は再 throw
    throw err;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">記録する</h1>

      {/* 検索セクション: インタラクティブなので Client Component */}
      <PodcastSearchSection />

      {/* 新着エピソード: 重いデータ取得を Suspense で分離 */}
      {/* ErrorBoundary でエラーをセクション単位に閉じ込め、ページ全体のクラッシュを防止 */}
      <ErrorBoundary>
        <Suspense fallback={<RecentEpisodesSkeleton />}>
          <RecentEpisodesSection />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
