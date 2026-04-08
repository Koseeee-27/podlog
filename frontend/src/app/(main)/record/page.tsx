import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import PodcastSearchSection from "./PodcastSearchSection";
import RecentEpisodesSection from "./RecentEpisodesSection";
import Loading from "@/components/ui/Loading";
import type { User } from "@/types/user";

/**
 * /record ページ（保護ページ）。
 *
 * Server Component で認証・プロフィール確認を行い、
 * 検索セクション（Client）と新着エピソードセクション（Server / Suspense）を配置する。
 * 新着エピソードの取得は重いため Suspense で分離し、
 * ユーザーはページ遷移後すぐに検索バーを操作できる。
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

      {/* 検索セクション: インタラクティブなので Client Component */}
      <PodcastSearchSection />

      {/* 新着エピソード: 重いデータ取得を Suspense で分離 */}
      <Suspense fallback={<Loading message="新着エピソードを読み込み中..." />}>
        <RecentEpisodesSection />
      </Suspense>
    </div>
  );
}
