"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProfileSetupForm from "@/components/profile/ProfileSetupForm";
import Loading from "@/components/ui/Loading";

export default function ProfileSetupClient() {
  const auth = useAuth();
  const router = useRouter();

  // 未認証リダイレクトは middleware で処理済み
  // プロフィール設定済みのユーザーはトップへリダイレクト
  useEffect(() => {
    if (auth.status === "authenticated") {
      router.push("/");
    }
  }, [auth.status, router]);

  if (auth.status !== "no_profile") {
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
