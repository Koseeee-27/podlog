import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
 * Server Component で認証・プロフィール確認を行い、
 * 検索セクション（Client）と新着エピソードセクション（Server / Suspense）を配置する。
 * 新着エピソードの取得は重いため Suspense で分離し、
 * ユーザーはページ遷移後すぐに検索バーを操作できる。
 *
 * 新着エピソードセクションは PodcastSearchSection の children として渡し、
 * 検索中は非表示にする（旧実装と同じ動作）。
 */
export default async function RecordPage() {
  // 認証チェック（getUser() で JWT 検証）
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // プロフィール確認（未設定ならセットアップへ誘導）
  try {
    await serverGet<User>("/users/me");
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      redirect("/profile/setup");
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
