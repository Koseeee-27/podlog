"use client";

import { useState, useTransition, use } from "react";
import UserListeningHistorySection from "@/components/profile/UserListeningHistory";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import type { ListeningRecordListResult } from "@/types/listening-record";
import { loadMoreListeningRecords } from "./actions";

const PAGE_SIZE = 10;

/**
 * use() で Promise を解決し、聴取履歴セクションに渡す。
 * 「もっと見る」のページネーションも管理する。
 */
export default function ListeningHistoryLoader({
  promise,
  username,
}: {
  promise: Promise<ListeningRecordListResult>;
  username: string;
}) {
  const initialData = use(promise);
  return <ListeningHistoryWithLoadMore initialData={initialData} username={username} />;
}

// ---------------------------------------------------------------------------
// 「もっと見る」のページネーションを管理するコンポーネント
//
// - useTransition で連打防止（isPending は即座に true になるため、useState より安全）
// - Server Action のエラーは catch で表示（Suspense/ErrorBoundary ではなく手動管理）
// - total はサーバーの最新値で更新し、hasMore の判定が正確になるようにする
// ---------------------------------------------------------------------------

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
