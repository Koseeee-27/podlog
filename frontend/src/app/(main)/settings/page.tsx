import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
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
  } catch (err) {
    // 404 = プロフィール未設定 → null のまま表示
    if (err instanceof ApiRequestError && err.status === 404) {
      // fall through
    } else {
      // その他のエラー（500等）は throw
      throw err;
    }
  }

  return <SettingsClient initialProfile={profile} />;
}
