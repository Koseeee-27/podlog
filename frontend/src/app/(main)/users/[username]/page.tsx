import { notFound } from "next/navigation";
import { usernameSchema } from "@/lib/schemas/common";
import { serverGet } from "@/lib/api/server";
import PublicProfileClient from "./PublicProfileClient";
import type { UserPublicProfile } from "@/types/user";
import type { FavoritePodcastListResult } from "@/types/user";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { UserReviewListResult } from "@/types/review";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

const PAGE_SIZE = 10;

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
  } catch {
    notFound();
  }

  // 各セクションのデータを Promise として作成（await しない）
  // プロフィール取得で DB が起きているので、コールドスタートの影響を受けにくい
  const favoritesPromise = serverGet<FavoritePodcastListResult>(
    `/users/${encodedUsername}/favorite-podcasts`,
    { noAuth: true, revalidate: 60 },
  );
  const recordsPromise = serverGet<ListeningRecordListResult>(
    `/users/${encodedUsername}/listening-records?limit=${PAGE_SIZE}&offset=0`,
    { noAuth: true, revalidate: 60 },
  );
  const reviewsPromise = serverGet<UserReviewListResult>(
    `/users/${encodedUsername}/reviews?limit=${PAGE_SIZE}&offset=0`,
    { noAuth: true, revalidate: 60 },
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
