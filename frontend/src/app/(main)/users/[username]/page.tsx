import { notFound } from "next/navigation";
import { usernameSchema } from "@/lib/schemas/common";
import {
  getUserPublicProfile,
  getUserFavoritePodcasts,
  getUserListeningRecords,
  getUserReviews,
} from "@/lib/data/users";
import { getViewer, type Viewer } from "@/lib/auth/getViewer";
import { ApiRequestError } from "@/types/api";
import PublicProfileClient from "./PublicProfileClient";
import type { UserPublicProfile } from "@/types/user";
import { PAGE_SIZE } from "./constants";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;

  if (!usernameSchema.safeParse(username).success) {
    notFound();
  }

  let profile: UserPublicProfile;
  try {
    profile = await getUserPublicProfile(username);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  // Client Component で「自分自身のプロフィールか」「管理者か」を判定するため、
  // Server Component で getViewer() を呼んで viewer を解決してから渡す。
  // 公開ページのため、viewer 取得だけ失敗してもページ全体を error.tsx に
  // 落とさず guest として描画を続行する。
  let viewer: Viewer;
  try {
    viewer = await getViewer();
  } catch (err) {
    console.error("[PublicProfilePage] getViewer failed, falling back to guest:", err);
    viewer = { status: "guest" };
  }

  // 各セクションのデータを Promise として作成（await しない）。
  // プロフィール取得で DB が起きているのでコールドスタートの影響を受けにくい。
  // ユーザー操作で頻繁に変わるデータなので DAL 側で `revalidate: 0` (キャッシュなし)。
  const favoritesPromise = getUserFavoritePodcasts(username);
  const recordsPromise = getUserListeningRecords(username, PAGE_SIZE, 0);
  const reviewsPromise = getUserReviews(username, PAGE_SIZE, 0);

  return (
    <PublicProfileClient
      username={username}
      initialProfile={profile}
      viewer={viewer}
      favoritesPromise={favoritesPromise}
      recordsPromise={recordsPromise}
      reviewsPromise={reviewsPromise}
    />
  );
}
