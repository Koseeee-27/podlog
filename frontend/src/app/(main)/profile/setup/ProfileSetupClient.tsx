"use client";

import { useRouter } from "next/navigation";
import ProfileSetupForm from "@/components/profile/ProfileSetupForm";

/**
 * 初回プロフィール作成画面のクライアント境界。
 *
 * 認証チェックとプロフィール未作成チェックは Server Component (page.tsx) で
 * 完了済みのため、ここでは loading 分岐は不要。保存完了時は `router.refresh()`
 * で Server Component ツリーを再実行し、`getViewer()` が
 * `authenticated` になった状態でホームに遷移する。
 */
export default function ProfileSetupClient() {
  const router = useRouter();

  async function handleComplete() {
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">プロフィール設定</h1>
        <p className="mt-1 text-stone-600">はじめに、プロフィールを設定しましょう</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <ProfileSetupForm onComplete={handleComplete} />
      </div>
    </div>
  );
}
