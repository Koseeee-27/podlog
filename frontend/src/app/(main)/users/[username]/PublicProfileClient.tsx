"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import UserFavoritePodcastsSection from "@/components/profile/UserFavoritePodcasts";
import UserListeningHistorySection from "@/components/profile/UserListeningHistory";
import UserReviewListSection from "@/components/profile/UserReviewList";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import AdminBadge from "@/components/ui/AdminBadge";
import type { UserPublicProfile, FavoritePodcastListResult } from "@/types/user";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { UserReviewListResult } from "@/types/review";
import { use } from "react";
import { loadMoreListeningRecords, loadMoreReviews } from "./actions";

interface PublicProfileClientProps {
  username: string;
  initialProfile: UserPublicProfile;
  favoritesPromise: Promise<FavoritePodcastListResult>;
  recordsPromise: Promise<ListeningRecordListResult>;
  reviewsPromise: Promise<UserReviewListResult>;
}

export default function PublicProfileClient({
  username,
  initialProfile,
  favoritesPromise,
  recordsPromise,
  reviewsPromise,
}: PublicProfileClientProps) {
  const auth = useAuth();
  const isOwnProfile = auth.status === "authenticated" && auth.profile.username === username;

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
                {isOwnProfile && auth.status === "authenticated" && auth.profile.is_admin && (
                  <AdminBadge />
                )}
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

      <Suspense fallback={<SectionSkeleton title="好きな番組" />}>
        <FavoritePodcastsLoader promise={favoritesPromise} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="聴取履歴" />}>
        <ListeningHistoryLoader promise={recordsPromise} username={username} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="レビュー" />}>
        <ReviewListLoader promise={reviewsPromise} username={username} />
      </Suspense>
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 mb-3">{title}</h2>
      <p className="text-sm text-stone-500">読み込み中...</p>
    </section>
  );
}

function FavoritePodcastsLoader({ promise }: { promise: Promise<FavoritePodcastListResult> }) {
  const data = use(promise);
  return <UserFavoritePodcastsSection podcasts={data.podcasts ?? []} />;
}

function ListeningHistoryLoader({
  promise,
  username,
}: {
  promise: Promise<ListeningRecordListResult>;
  username: string;
}) {
  const data = use(promise);
  return <ListeningHistoryWithLoadMore initialData={data} username={username} />;
}

function ReviewListLoader({
  promise,
  username,
}: {
  promise: Promise<UserReviewListResult>;
  username: string;
}) {
  const data = use(promise);
  return <ReviewListWithLoadMore initialData={data} username={username} />;
}

const PAGE_SIZE = 10;

function ListeningHistoryWithLoadMore({
  initialData,
  username,
}: {
  initialData: ListeningRecordListResult;
  username: string;
}) {
  const [records, setRecords] = useState(initialData.records ?? []);
  const [total] = useState(initialData.total);
  const [loading, setLoading] = useState(false);
  const hasMore = records.length < total;

  const handleLoadMore = async () => {
    setLoading(true);
    try {
      const data = await loadMoreListeningRecords(username, records.length, PAGE_SIZE);
      setRecords((prev) => [...prev, ...(data.records ?? [])]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserListeningHistorySection
      records={records}
      total={total}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
    />
  );
}

function ReviewListWithLoadMore({
  initialData,
  username,
}: {
  initialData: UserReviewListResult;
  username: string;
}) {
  const [reviews, setReviews] = useState(initialData.reviews ?? []);
  const [total] = useState(initialData.total);
  const [loading, setLoading] = useState(false);
  const hasMore = reviews.length < total;

  const handleLoadMore = async () => {
    setLoading(true);
    try {
      const data = await loadMoreReviews(username, reviews.length, PAGE_SIZE);
      setReviews((prev) => [...prev, ...(data.reviews ?? [])]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserReviewListSection
      reviews={reviews}
      total={total}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
    />
  );
}
