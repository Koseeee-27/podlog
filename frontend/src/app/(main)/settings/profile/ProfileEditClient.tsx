"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProfileEditForm from "@/components/profile/ProfileEditPage";
import type { User } from "@/types/user";

interface ProfileEditClientProps {
  initialProfile: User;
}

export default function ProfileEditClient({ initialProfile }: ProfileEditClientProps) {
  const auth = useAuth();
  const router = useRouter();

  // 認証・プロフィール存在チェックは Server Component (page.tsx) で完了済み
  // クライアント側で最新のプロフィールが取れればそちらを使用
  const profile = auth.status === "authenticated" ? auth.profile : initialProfile;
  const refreshProfile = auth.status === "authenticated" ? auth.refreshProfile : async () => {};

  function handleSaveComplete() {
    router.push(`/users/${profile.username}`);
  }

  function handleCancel() {
    router.back();
  }

  return (
    <ProfileEditForm
      profile={profile}
      refreshProfile={refreshProfile}
      onSaveComplete={handleSaveComplete}
      onCancel={handleCancel}
    />
  );
}
