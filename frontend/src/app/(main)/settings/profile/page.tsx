import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import ProfileEditClient from "./ProfileEditClient";
import type { User } from "@/types/user";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profile: User | null = null;
  try {
    profile = await serverGet<User>("/users/me");
  } catch {
    // プロフィール未設定
  }

  // プロフィール未設定のユーザーはセットアップへリダイレクト
  if (!profile) {
    redirect("/profile/setup");
  }

  return <ProfileEditClient initialProfile={profile} />;
}
