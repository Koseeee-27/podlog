"use client";

import { useAuth } from "@/hooks/useAuth";
import ProfileSetupForm from "@/components/profile/ProfileSetupForm";
import Loading from "@/components/ui/Loading";

export default function ProfileSetupClient() {
  const auth = useAuth();

  // 認証チェックとプロフィール存在チェックは Server Component (page.tsx) で完了済み
  // auth がまだロード中の場合はローディングを表示
  if (auth.status === "loading") {
    return <Loading />;
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">プロフィール設定</h1>
        <p className="mt-1 text-stone-600">はじめに、プロフィールを設定しましょう</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <ProfileSetupForm onComplete={auth.refreshProfile} />
      </div>
    </div>
  );
}
