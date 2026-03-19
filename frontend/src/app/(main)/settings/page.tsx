import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import SettingsClient from "./SettingsClient";
import type { User } from "@/types/user";

export default async function SettingsPage() {
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
    // プロフィール未設定の場合は null のまま
  }

  return <SettingsClient initialProfile={profile} />;
}
