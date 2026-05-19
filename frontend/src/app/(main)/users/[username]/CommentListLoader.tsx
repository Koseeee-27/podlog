"use client";

import { useState, useTransition, use } from "react";
import UserCommentList from "@/components/profile/UserCommentList";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import type { UserCommentListResult } from "@/types/comment";
import { fetchUserComments } from "@/lib/api/comments";
import { PAGE_SIZE } from "./constants";

/**
 * ユーザーページの感想一覧 Loader（Client Component）。
 *
 * 評価/感想分離（podlog-workspace#59）の P-8 で追加。`ReviewListLoader`
 * （`./ReviewListLoader.tsx`、旧 review 用）の感想版で、同じ構造（`use()` で
 * Promise を解決 → `useTransition` で「もっと見る」管理）を踏襲する。
 *
 * 旧 `ReviewListLoader` は P-9 で削除予定。本 PR では参照を切るだけにとどめる
 * （`PublicProfileClient` 側で本 Loader を新規参照する）。
 *
 * エラー経路は 2 つに分かれる:
 * - **初回 `use(promise)` 失敗**: throw が伝播して親の `ErrorBoundary`
 *   （`PublicProfileClient.tsx`）で `<SectionError title="感想" />` を表示
 * - **「もっと見る」失敗**: 取得済みリストは残したいので `useTransition` 内で
 *   try/catch し、`<ErrorMessage>` をリスト下に表示
 *
 * この 2 経路は `ListeningHistoryLoader` / `RatingStatsLoader` と整合的。
 */
export default function CommentListLoader({
  promise,
  username,
}: {
  promise: Promise<UserCommentListResult>;
  username: string;
}) {
  const initialData = use(promise);
  return (
    <CommentListWithLoadMore initialData={initialData} username={username} />
  );
}

// ---------------------------------------------------------------------------
// 「もっと見る」のページネーションを管理するコンポーネント
//
// - useTransition で連打防止（isPending は即座に true になるため、useState より安全）
// - クライアント API (`fetchUserComments`) で直接取得する
//   (FE 規約「ユーザー操作による追加データ取得はクライアント API で直接行う」
//    に従い、Server Action は使わない)
// - エラーは catch で表示（Suspense/ErrorBoundary ではなく手動管理）
// - total はサーバーの最新値で更新し、hasMore の判定が正確になるようにする
// ---------------------------------------------------------------------------

function CommentListWithLoadMore({
  initialData,
  username,
}: {
  initialData: UserCommentListResult;
  username: string;
}) {
  const [comments, setComments] = useState(initialData.comments);
  const [total, setTotal] = useState(initialData.total);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasMore = comments.length < total;

  const handleLoadMore = () => {
    startTransition(async () => {
      try {
        setError(null);
        const data = await fetchUserComments(username, {
          limit: PAGE_SIZE,
          offset: comments.length,
        });
        setComments((prev) => [...prev, ...data.comments]);
        setTotal(data.total);
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err));
      }
    });
  };

  return (
    <>
      <UserCommentList
        comments={comments}
        total={total}
        isPending={isPending}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />
      {error && <ErrorMessage message={error} />}
    </>
  );
}
