import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { usernameSchema } from "@/lib/schemas/common";
import {
  getUserPublicProfile,
  getUserFavoritePodcasts,
  getUserListeningRecords,
  getUserReviews,
} from "@/lib/data/users";
import {
  buildMetadataDescription,
  defaultOpenGraph,
  defaultOpenGraphImages,
  defaultTwitter,
  pickMetadataImage,
} from "@/lib/metadata/shared";
import { getViewer, type Viewer } from "@/lib/auth/getViewer";
import { ApiRequestError } from "@/types/api";
import PublicProfileClient from "./PublicProfileClient";
import type { UserPublicProfile } from "@/types/user";
import { PAGE_SIZE } from "./constants";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

/**
 * 公開プロフィールページの metadata を動的に生成する。
 *
 * - `getUserPublicProfile` は `cache()` 済み。page 本体と generateMetadata で
 *   同じ username を取得しても API コールは 1 回しか発生しない
 * - DAL が throw した場合は try/catch せず Next.js 標準の挙動に任せる
 * - description は bio があれば優先、なければ「@username の聴取履歴・レビュー」
 *   というデフォルト文言を fallback に使う
 */
export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;

  if (!usernameSchema.safeParse(username).success) {
    notFound();
  }

  const profile = await getUserPublicProfile(username);

  const title = `${profile.display_name}（@${profile.username}） | PodLog`;
  const description = buildMetadataDescription(
    profile.bio,
    `@${profile.username} の聴取履歴・レビュー | PodLog`,
  );
  const canonicalPath = `/users/${profile.username}`;
  // `pickMetadataImage` で空文字 / null / undefined を一律「無し」に正規化する
  // （DB 由来で `""` が入った場合に壊れた og:image タグを出さないため）
  const ogImage = pickMetadataImage(profile.avatar_url);
  const ogImages = ogImage ? [ogImage] : [...defaultOpenGraphImages];
  const twitterImages = ogImage ? [ogImage] : ["/og-default.png"];

  return {
    title,
    description,
    openGraph: {
      ...defaultOpenGraph,
      title,
      description,
      url: canonicalPath,
      images: ogImages,
    },
    twitter: {
      ...defaultTwitter,
      title,
      description,
      images: twitterImages,
    },
    alternates: { canonical: canonicalPath },
  };
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
