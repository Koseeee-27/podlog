"use client";

import { use } from "react";
import UserFavoritePodcastsSection from "@/components/profile/UserFavoritePodcasts";
import type { FavoritePodcastListResult } from "@/types/user";

/**
 * use() で Promise を解決し、好きな番組セクションに渡す。
 * データが届くまで親の Suspense がフォールバックを表示し、
 * Promise が reject した場合は親の ErrorBoundary がキャッチする。
 */
export default function FavoritePodcastsLoader({
  promise,
}: {
  promise: Promise<FavoritePodcastListResult>;
}) {
  const data = use(promise);
  return <UserFavoritePodcastsSection podcasts={data.podcasts ?? []} />;
}
