"use client";

import { useState, useTransition, use } from "react";
import UserReviewListSection from "@/components/profile/UserReviewList";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import type { UserReviewListResult } from "@/types/review";
import { fetchUserReviews } from "@/lib/api/users";
import { PAGE_SIZE } from "./constants";

/**
 * use() で Promise を解決し、レビューセクションに渡す。
 * 「もっと見る」のページネーションも管理する。
 */
export default function ReviewListLoader({
  promise,
  username,
}: {
  promise: Promise<UserReviewListResult>;
  username: string;
}) {
  const initialData = use(promise);
  return <ReviewListWithLoadMore initialData={initialData} username={username} />;
}

// ---------------------------------------------------------------------------
// 「もっと見る」のページネーションを管理するコンポーネント
//
// - useTransition で連打防止（isPending は即座に true になるため、useState より安全）
// - クライアント API (`fetchUserReviews`) で直接取得する
//   (frontend.md「ユーザー操作による追加データ取得はクライアント API で直接行う」
//    の規約に従い、Server Action は使わない)
// - エラーは catch で表示（Suspense/ErrorBoundary ではなく手動管理）
// - total はサーバーの最新値で更新し、hasMore の判定が正確になるようにする
// ---------------------------------------------------------------------------

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
        const data = await fetchUserReviews(username, PAGE_SIZE, reviews.length);
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
