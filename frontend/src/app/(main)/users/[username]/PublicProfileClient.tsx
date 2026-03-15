"use client";

import { useParams } from "next/navigation";
import { usePublicProfile } from "@/hooks/useProfile";
import { useUserListeningRecords, useUserReviews, useUserFavoritePodcasts } from "@/hooks/useUserPage";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import UserFavoritePodcasts from "@/components/profile/UserFavoritePodcasts";
import UserListeningHistory from "@/components/profile/UserListeningHistory";
import UserReviewList from "@/components/profile/UserReviewList";

export default function PublicProfileClient() {
  const params = useParams();
  const username = params.username as string;
  const { profile, loading, error } = usePublicProfile(username);
  const {
    podcasts: favoritePodcasts,
    loading: favLoading,
    error: favError,
  } = useUserFavoritePodcasts(username);
  const {
    records,
    total: recordsTotal,
    loading: recordsLoading,
    error: recordsError,
    hasMore: recordsHasMore,
    loadMore: loadMoreRecords,
  } = useUserListeningRecords(username);
  const {
    reviews,
    total: reviewsTotal,
    loading: reviewsLoading,
    error: reviewsError,
    hasMore: reviewsHasMore,
    loadMore: loadMoreReviews,
  } = useUserReviews(username);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!profile) {
    return <ErrorMessage message="ユーザーが見つかりません" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar src={profile.avatar_url} alt={profile.display_name} size="xl" />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-stone-900">{profile.display_name}</h1>
            <p className="text-stone-500">@{profile.username}</p>
            {profile.bio && (
              <p className="mt-3 text-sm text-stone-700 leading-relaxed">{profile.bio}</p>
            )}
            <p className="mt-2 text-xs text-stone-400">
              {formatDate(profile.created_at)} に登録
            </p>
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
