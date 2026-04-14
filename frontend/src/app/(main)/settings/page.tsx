import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/me";
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
    profile = await getMyProfile();
  } catch (err) {
    if (err instanceof ApiRequestError) {
      // 401/403 = セッション失効 → /login (admin/page.tsx と挙動を揃える)
      if (err.status === 401 || err.status === 403) {
        redirect("/login");
      }
      // 404 = プロフィール未設定 → null のまま表示
      if (err.status === 404) {
        // fall through
      } else {
        // その他のエラー（500 等）は throw
        throw err;
      }
    } else {
      throw err;
    }
  }

  return <SettingsClient initialProfile={profile} />;
}
