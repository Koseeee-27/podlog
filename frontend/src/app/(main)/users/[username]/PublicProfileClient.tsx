"use client";

import { Suspense } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { formatDate } from "@/lib/utils";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import AdminBadge from "@/components/ui/AdminBadge";
import type { UserPublicProfile, FavoritePodcastListResult } from "@/types/user";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { UserRatingsStatsResult } from "@/types/rating";
import type { UserCommentListResult } from "@/types/comment";
import type { Viewer } from "@/lib/auth/getViewer";
import { SectionSkeleton, SectionError } from "./SectionFallbacks";
import FavoritePodcastsLoader from "./FavoritePodcastsLoader";
import ListeningHistoryLoader from "./ListeningHistoryLoader";
import RatingStatsLoader from "./RatingStatsLoader";
import CommentListLoader from "./CommentListLoader";

interface PublicProfileClientProps {
  username: string;
  initialProfile: UserPublicProfile;
  /** 閲覧者自身の状態 (Server Component で解決済み)。 */
  viewer: Viewer;
  favoritesPromise: Promise<FavoritePodcastListResult>;
  recordsPromise: Promise<ListeningRecordListResult>;
  /**
   * 評価統計サマリー Promise。評価/感想分離（podlog-workspace#59）の P-6 で
   * 旧 `reviewsPromise`（個別レビュー一覧）から差し替え。screens.md の
   * 「個別の評価レコードは表示しない」方針に整合。
   */
  ratingsStatsPromise: Promise<UserRatingsStatsResult>;
  /**
   * ユーザーの公開感想一覧 Promise。評価/感想分離（podlog-workspace#59）の P-8 で
   * 追加。評価サマリーとは独立したセクションとして「感想」を表示する
   * （`screens.md` のユーザーページ仕様に従う）。
   */
  commentsPromise: Promise<UserCommentListResult>;
}

export default function PublicProfileClient({
  username,
  initialProfile,
  viewer,
  favoritesPromise,
  recordsPromise,
  ratingsStatsPromise,
  commentsPromise,
}: PublicProfileClientProps) {
  const isOwnProfile =
    viewer.status === "authenticated" && viewer.profile.username === username;
  const isOwnAdmin = isOwnProfile && viewer.profile.is_admin;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card padding="lg">
        <div className="relative">
          {isOwnProfile && (
            <Link
              href="/settings"
              className="absolute top-0 right-0 sm:hidden p-1 text-stone-400 hover:text-stone-600 transition-colors"
              aria-label="設定"
            >
              <Cog6ToothIcon className="h-6 w-6" />
            </Link>
          )}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar src={initialProfile.avatar_url} alt={initialProfile.display_name} size="xl" />
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h1 className="text-2xl font-bold text-stone-900">{initialProfile.display_name}</h1>
                {isOwnAdmin && <AdminBadge />}
              </div>
              <p className="text-stone-500">@{initialProfile.username}</p>
              {initialProfile.bio && (
                <p className="mt-3 text-sm text-stone-700 leading-relaxed">{initialProfile.bio}</p>
              )}
              <p className="mt-2 text-xs text-stone-400">
                {formatDate(initialProfile.created_at)} に登録
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/*
        各セクションを ErrorBoundary + Suspense でラップ。
        - Suspense: データ読み込み中に「読み込み中...」を表示
        - ErrorBoundary: API エラー時にセクション単位でエラー表示（ページ全体はクラッシュしない）
        - key={username}: ユーザー切り替え時に state をリセットするため再マウントさせる
      */}
      <ErrorBoundary key={`fav-${username}`} fallback={<SectionError title="好きな番組" />}>
        <Suspense fallback={<SectionSkeleton title="好きな番組" />}>
          <FavoritePodcastsLoader promise={favoritesPromise} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary key={`records-${username}`} fallback={<SectionError title="聴取履歴" />}>
        <Suspense fallback={<SectionSkeleton title="聴取履歴" />}>
          <ListeningHistoryLoader promise={recordsPromise} username={username} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary key={`ratings-${username}`} fallback={<SectionError title="評価サマリー" />}>
        <Suspense fallback={<SectionSkeleton title="評価サマリー" />}>
          <RatingStatsLoader promise={ratingsStatsPromise} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary key={`comments-${username}`} fallback={<SectionError title="感想" />}>
        <Suspense fallback={<SectionSkeleton title="感想" />}>
          <CommentListLoader promise={commentsPromise} username={username} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
