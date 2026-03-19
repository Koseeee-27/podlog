import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import ProfileSetupClient from "./ProfileSetupClient";
import type { User } from "@/types/user";

export default async function ProfileSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // プロフィール設定済みならトップへリダイレクト
  try {
    await serverGet<User>("/users/me");
    // 取得成功 = プロフィール設定済み
    redirect("/");
  } catch (err) {
    // 404 = プロフィール未設定 → セットアップ画面を表示
    if (err instanceof ApiRequestError && err.status === 404) {
      // fall through to render setup form
    } else {
      // redirect() は特殊なエラーとして throw されるので再 throw
      throw err;
    }
  }

  return <ProfileSetupClient />;
}
