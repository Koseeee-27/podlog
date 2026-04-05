"use client";

import { Suspense, useState, useTransition, use } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { formatDate, getUserFriendlyErrorMessage } from "@/lib/utils";
import UserFavoritePodcastsSection from "@/components/profile/UserFavoritePodcasts";
import UserListeningHistorySection from "@/components/profile/UserListeningHistory";
import UserReviewListSection from "@/components/profile/UserReviewList";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import AdminBadge from "@/components/ui/AdminBadge";
import type { UserPublicProfile, FavoritePodcastListResult } from "@/types/user";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { UserReviewListResult } from "@/types/review";
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

      {/*
        各セクションを ErrorBoundary + Suspense でラップ。
        - Suspense: データ読み込み中に「読み込み中...」を表示
        - ErrorBoundary: API エラー時にセクション単位でエラー表示（ページ全体はクラッシュしない）
      */}
      <ErrorBoundary fallback={<SectionError title="好きな番組" />}>
        <Suspense fallback={<SectionSkeleton title="好きな番組" />}>
          <FavoritePodcastsLoader promise={favoritesPromise} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionError title="聴取履歴" />}>
        <Suspense fallback={<SectionSkeleton title="聴取履歴" />}>
          <ListeningHistoryLoader promise={recordsPromise} username={username} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionError title="レビュー" />}>
        <Suspense fallback={<SectionSkeleton title="レビュー" />}>
          <ReviewListLoader promise={reviewsPromise} username={username} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ローディング・エラー用のフォールバック UI
// ---------------------------------------------------------------------------

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 mb-3">{title}</h2>
      <p className="text-sm text-stone-500">読み込み中...</p>
    </section>
  );
}

function SectionError({ title }: { title: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 mb-3">{title}</h2>
      <ErrorMessage message={`${title}の取得に失敗しました`} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// use() で Promise を解決し、表示用コンポーネントに渡すローダー
// use() が Promise を受け取ると、データが届くまで Suspense のフォールバックが表示される。
// Promise が reject した場合は、ErrorBoundary がキャッチしてエラー表示する。
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 「もっと見る」（ページネーション）を管理するコンポーネント
//
// - useTransition で連打防止（isPending は即座に true になるため、useState より安全）
// - Server Action のエラーは catch で表示（Suspense/ErrorBoundary ではなく手動管理）
// - total はサーバーの最新値で更新し、hasMore の判定が正確になるようにする
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

function ListeningHistoryWithLoadMore({
  initialData,
  username,
}: {
  initialData: ListeningRecordListResult;
  username: string;
}) {
  const [records, setRecords] = useState(initialData.records ?? []);
  const [total, setTotal] = useState(initialData.total);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasMore = records.length < total;

  const handleLoadMore = () => {
    startTransition(async () => {
      try {
        setError(null);
        const data = await loadMoreListeningRecords(username, records.length, PAGE_SIZE);
        setRecords((prev) => [...prev, ...(data.records ?? [])]);
        setTotal(data.total);
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err));
      }
    });
  };

  return (
    <>
      <UserListeningHistorySection
        records={records}
        total={total}
        isPending={isPending}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />
      {error && <ErrorMessage message={error} />}
    </>
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
  const [total, setTotal] = useState(initialData.total);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasMore = reviews.length < total;

  const handleLoadMore = () => {
    startTransition(async () => {
      try {
        setError(null);
        const data = await loadMoreReviews(username, reviews.length, PAGE_SIZE);
        setReviews((prev) => [...prev, ...(data.reviews ?? [])]);
        setTotal(data.total);
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err));
      }
    });
  };

  return (
    <>
      <UserReviewListSection
        reviews={reviews}
        total={total}
        isPending={isPending}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />
      {error && <ErrorMessage message={error} />}
    </>
  );
}
