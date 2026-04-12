import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import ProfileEditClient from "./ProfileEditClient";
import type { User, FavoritePodcastListResult } from "@/types/user";

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

  // 好きな番組は公開エンドポイントなので noAuth で取得（二重のセッション取得を避ける）
  // 取得失敗時は throw して settings/error.tsx に委譲する
  const favorites = await serverGet<FavoritePodcastListResult>(
    `/users/${encodeURIComponent(profile.username)}/favorite-podcasts`,
    { noAuth: true, revalidate: 0 },
  );

  return (
    <ProfileEditClient
      initialProfile={profile}
      initialFavoritePodcasts={favorites.podcasts}
    />
  );
}
