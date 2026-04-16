"use client";

import { useRouter } from "next/navigation";
import ProfileEditForm from "@/components/profile/ProfileEditPage";
import type { User, FavoritePodcastItem } from "@/types/user";

interface ProfileEditClientProps {
  /** Server Component (page.tsx) で解決済みのプロフィール。 */
  profile: User;
  initialFavoritePodcasts: FavoritePodcastItem[];
}

export default function ProfileEditClient({
  profile,
  initialFavoritePodcasts,
}: ProfileEditClientProps) {
  const router = useRouter();

  /**
   * 保存後のプロフィール再取得。
   * 以前は `useAuth().refreshProfile` で Supabase 経由の再取得を行っていたが、
   * 3 層 DAL 構造では `router.refresh()` で Server Component ツリーを
   * 再実行し、`getViewer()` / `getMyProfile()` が新しいデータを拾うようにする。
   * `router.refresh()` は Promise を返さないため async 関数でラップして
   * ProfileEditForm の API シグネチャに合わせる。
   */
  async function refreshProfile() {
    router.refresh();
  }

  function handleSaveComplete() {
    router.push(`/users/${profile.username}`);
  }

  function handleCancel() {
    router.back();
  }

  return (
    <ProfileEditForm
      profile={profile}
      initialFavoritePodcasts={initialFavoritePodcasts}
      refreshProfile={refreshProfile}
      onSaveComplete={handleSaveComplete}
      onCancel={handleCancel}
    />
  );
}
