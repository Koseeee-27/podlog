import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { usernameSchema } from "@/lib/schemas/common";
import {
  getUserPublicProfile,
  getUserFavoritePodcasts,
  getUserListeningRecords,
} from "@/lib/data/users";
import { getUserRatingsStats } from "@/lib/data/ratings";
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
 * - DAL の throw は page と同じく try/catch して 404 → `notFound()`、それ以外は
 *   rethrow に揃える。`generateMetadata` から素の throw を伝播させると Next.js
 *   のデフォルトエラー画面に倒れて `error.tsx` に届かず、status code が
 *   200/500 にブレる（Next.js Discussion #49925 / Issue #75543）
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

  let profile: UserPublicProfile;
  try {
    profile = await getUserPublicProfile(username);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

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
  //
  // キャッシュ戦略は DAL 関数ごとに分かれている:
  //  - `getUserFavoritePodcasts`: `revalidate: 0`（お気に入りはユーザー操作で頻繁に変わる）
  //  - `getUserListeningRecords`: `revalidate: 0`（聴取履歴も同様）
  //  - `getUserRatingsStats`:    `revalidate: 60`（集計値は短期キャッシュで負荷軽減）
  //
  // 評価/感想分離（podlog-workspace#59）の P-6 で、旧 `getUserReviews`（個別レビュー
  // 一覧、`revalidate: 0`）を `getUserRatingsStats`（統計サマリー、`revalidate: 60`）に
  // 置き換えた。screens.md の評価サマリーセクション（個別レコードは表示しない方針）に
  // 整合させている。
  const favoritesPromise = getUserFavoritePodcasts(username);
  const recordsPromise = getUserListeningRecords(username, PAGE_SIZE, 0);
  const ratingsStatsPromise = getUserRatingsStats(username);

  return (
    <PublicProfileClient
      username={username}
      initialProfile={profile}
      viewer={viewer}
      favoritesPromise={favoritesPromise}
      recordsPromise={recordsPromise}
      ratingsStatsPromise={ratingsStatsPromise}
    />
  );
}
