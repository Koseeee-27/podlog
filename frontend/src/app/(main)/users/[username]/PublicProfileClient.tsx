"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useUserListeningRecords, useUserReviews, useUserFavoritePodcasts } from "@/hooks/useUserPage";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import UserFavoritePodcasts from "@/components/profile/UserFavoritePodcasts";
import UserListeningHistory from "@/components/profile/UserListeningHistory";
import UserReviewList from "@/components/profile/UserReviewList";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import AdminBadge from "@/components/ui/AdminBadge";
import type { UserPublicProfile } from "@/types/user";

interface PublicProfileClientProps {
  username: string;
  initialProfile: UserPublicProfile;
}

export default function PublicProfileClient({ username, initialProfile }: PublicProfileClientProps) {
  const auth = useAuth();
  const isOwnProfile = auth.status === "authenticated" && auth.profile.username === username;

  // プロフィールはサーバーから取得済みなので常に ready
  const {
    podcasts: favoritePodcasts,
    loading: favLoading,
    error: favError,
  } = useUserFavoritePodcasts(username, true);
  const {
    records,
    total: recordsTotal,
    loading: recordsLoading,
    error: recordsError,
    hasMore: recordsHasMore,
    loadMore: loadMoreRecords,
  } = useUserListeningRecords(username, true);
  const {
    reviews,
    total: reviewsTotal,
    loading: reviewsLoading,
    error: reviewsError,
    hasMore: reviewsHasMore,
    loadMore: loadMoreReviews,
  } = useUserReviews(username, true);

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

      <UserFavoritePodcasts podcasts={favoritePodcasts} loading={favLoading} error={favError} />

      <UserListeningHistory
        records={records}
        total={recordsTotal}
        loading={recordsLoading}
        error={recordsError}
        hasMore={recordsHasMore}
        onLoadMore={loadMoreRecords}
      />

      <UserReviewList
        reviews={reviews}
        total={reviewsTotal}
        loading={reviewsLoading}
        error={reviewsError}
        hasMore={reviewsHasMore}
        onLoadMore={loadMoreReviews}
      />
    </div>
  );
}
