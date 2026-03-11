"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProfileSetupForm from "@/components/profile/ProfileSetupForm";
import Loading from "@/components/ui/Loading";

export default function ProfileSetupClient() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.push("/login");
    } else if (auth.status === "authenticated") {
      router.push("/");
    }
  }, [auth.status, router]);

  if (auth.status !== "no_profile") {
    return <Loading />;
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">プロフィール設定</h1>
        <p className="mt-1 text-gray-600">はじめに、プロフィールを設定しましょう</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <ProfileSetupForm onComplete={auth.refreshProfile} />
      </div>
    </div>
  );
}
