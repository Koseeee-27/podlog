import { Suspense } from "react";
import { redirect } from "next/navigation";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import PodcastSearchSection from "./PodcastSearchSection";
import RecentEpisodesSection from "./RecentEpisodesSection";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import type { User } from "@/types/user";

/**
 * /record ページ（保護ページ）。
 *
 * 認証チェックは middleware で完了済み。
 * ここではプロフィール確認のみ行い、未設定ならセットアップへ誘導する。
 * serverGet("/users/me") が 401 を返した場合はセッション期限切れとして /login へ。
 *
 * 検索セクション（Client）と新着エピソードセクション（Server / Suspense）を配置し、
 * 新着エピソードの取得は Suspense で分離してページ表示をブロックしない。
 */
export default async function RecordPage() {
  // プロフィール確認（認証チェックは middleware で完了済み）
  try {
    await serverGet<User>("/users/me");
  } catch (err) {
    if (err instanceof ApiRequestError) {
      if (err.status === 404) redirect("/profile/setup");
      if (err.status === 401) redirect("/login");
    }
    throw err;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">記録する</h1>

      {/*
        PodcastSearchSection に新着エピソードを children で渡す。
        検索中は children を非表示にする（旧実装と同じ動作）。
      */}
      <PodcastSearchSection>
        {/* ErrorBoundary でエラーをセクション単位に閉じ込め、ページ全体のクラッシュを防止 */}
        <ErrorBoundary
          fallback={
            <section className="mt-8">
              <ErrorMessage message="新着エピソードの読み込みに失敗しました" />
            </section>
          }
        >
          <Suspense
            fallback={<Loading message="新着エピソードを読み込み中..." />}
          >
            <RecentEpisodesSection />
          </Suspense>
        </ErrorBoundary>
      </PodcastSearchSection>
    </div>
  );
}
