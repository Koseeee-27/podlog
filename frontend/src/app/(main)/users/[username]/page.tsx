import { notFound } from "next/navigation";
import { usernameSchema } from "@/lib/schemas/common";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import PublicProfileClient from "./PublicProfileClient";
import type { UserPublicProfile } from "@/types/user";
import type { FavoritePodcastListResult } from "@/types/user";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { UserReviewListResult } from "@/types/review";
import { PAGE_SIZE } from "./constants";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;

  if (!usernameSchema.safeParse(username).success) {
    notFound();
  }

  const encodedUsername = encodeURIComponent(username);

  let profile: UserPublicProfile;
  try {
    profile = await serverGet<UserPublicProfile>(
      `/users/${encodedUsername}`,
      { noAuth: true, revalidate: 60 },
    );
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  // 各セクションのデータを Promise として作成（await しない）
  // プロフィール取得で DB が起きているので、コールドスタートの影響を受けにくい
  // ユーザー操作で頻繁に変わるデータなのでキャッシュしない（revalidate: 0）
  const favoritesPromise = serverGet<FavoritePodcastListResult>(
    `/users/${encodedUsername}/favorite-podcasts`,
    { noAuth: true, revalidate: 0 },
  );
  const recordsPromise = serverGet<ListeningRecordListResult>(
    `/users/${encodedUsername}/listening-records?limit=${PAGE_SIZE}&offset=0`,
    { noAuth: true, revalidate: 0 },
  );
  const reviewsPromise = serverGet<UserReviewListResult>(
    `/users/${encodedUsername}/reviews?limit=${PAGE_SIZE}&offset=0`,
    { noAuth: true, revalidate: 0 },
  );

  return (
    <PublicProfileClient
      username={username}
      initialProfile={profile}
      favoritesPromise={favoritesPromise}
      recordsPromise={recordsPromise}
      reviewsPromise={reviewsPromise}
    />
  );
}
