import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/me";
import { getUserFavoritePodcasts } from "@/lib/data/users";
import { ApiRequestError } from "@/types/api";
import ProfileEditClient from "./ProfileEditClient";
import type { User } from "@/types/user";

/**
 * /settings/profile ページ (保護ページ)。
 *
 * 認証チェックは middleware (`/settings` は保護パス) で完了済み。
 * page 側では `getMyProfile()` の 401/403/404 catch でフォローアップする
 * (FE 規約: 認証情報の取得は DAL/getViewer に集約し、Server Component から
 * Supabase クライアントを直接呼ばない)。
 *
 * `getMyProfile()` 成功時は必ず `User` を返し、404 は catch で
 * `redirect("/profile/setup")` する (`redirect` は内部的に throw する) ため、
 * catch を抜けて以降では `profile` は確実に `User` 型。
 */
export default async function ProfileEditPage() {
  let profile: User;
  try {
    profile = await getMyProfile();
  } catch (err) {
    if (err instanceof ApiRequestError) {
      // 401/403 = セッション失効 → /login
      if (err.status === 401 || err.status === 403) {
        redirect("/login");
      }
      // 404 = プロフィール未設定 → セットアップへ
      if (err.status === 404) {
        redirect("/profile/setup");
      }
    }
    // その他のエラー（500 等）は throw して Next.js エラーページに任せる
    throw err;
  }

  // 好きな番組は公開エンドポイント (`/users/:username/favorite-podcasts`) で取得。
  // バックエンドに `GET /users/me/favorite-podcasts` は存在しない (`PUT` のみ)。
  // 取得失敗時は throw して settings/error.tsx に委譲する。
  const favorites = await getUserFavoritePodcasts(profile.username);

  return (
    <ProfileEditClient
      profile={profile}
      initialFavoritePodcasts={favorites.podcasts}
    />
  );
}
