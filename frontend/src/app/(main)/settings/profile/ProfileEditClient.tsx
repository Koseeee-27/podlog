"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Loading from "@/components/ui/Loading";
import ProfileEditForm from "@/components/profile/ProfileEditPage";
import type { User } from "@/types/user";

export default function ProfileEditClient() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.push("/login");
    } else if (auth.status === "no_profile") {
      router.push("/profile/setup");
    }
  }, [auth.status, router]);

  if (auth.status !== "authenticated") {
    return <Loading />;
  }

  return (
    <ProfileEditFormWrapper
      profile={auth.profile}
      refreshProfile={auth.refreshProfile}
    />
  );
}

function ProfileEditFormWrapper({
  profile,
  refreshProfile,
}: {
  profile: User;
  refreshProfile: () => Promise<void>;
}) {
  const router = useRouter();

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
