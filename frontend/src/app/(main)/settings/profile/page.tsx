import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getMyFavoritePodcasts } from "@/lib/data/me";
import { ApiRequestError } from "@/types/api";
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
    profile = await getMyProfile();
  } catch (err) {
    // 404 = プロフィール未設定 → セットアップへ
    if (err instanceof ApiRequestError && err.status === 404) {
      redirect("/profile/setup");
    }
    // その他のエラー（500等）は throw して Next.js エラーページに任せる
    throw err;
  }

  if (!profile) {
    redirect("/profile/setup");
  }

  // 好きな番組は認証必須のショートカット (`/users/me/favorite-podcasts`) で取得。
  // ユーザー名解決を介さず 1 リクエストで済む。
  // 取得失敗時は throw して settings/error.tsx に委譲する。
  const favorites = await getMyFavoritePodcasts();

  return (
    <ProfileEditClient
      initialProfile={profile}
      initialFavoritePodcasts={favorites.podcasts}
    />
  );
}
