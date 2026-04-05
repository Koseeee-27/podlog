"use server";

import { serverGet } from "@/lib/api/server";
import { usernameSchema } from "@/lib/schemas/common";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { UserReviewListResult } from "@/types/review";

/** 初回取得・追加取得で共通のページサイズ */
export const PAGE_SIZE = 10;

const MAX_LIMIT = 100;

/**
 * Server Actions は外部から任意の引数で呼ばれ得るため、
 * 不正な値でバックエンドに負荷をかけないようバリデーションする。
 */
function validatePaginationParams(username: string, offset: number, limit: number) {
  usernameSchema.parse(username);

  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), MAX_LIMIT));

  return { safeOffset, safeLimit };
}

export async function loadMoreListeningRecords(
  username: string,
  offset: number,
  limit: number,
): Promise<ListeningRecordListResult> {
  const { safeOffset, safeLimit } = validatePaginationParams(username, offset, limit);
  const encodedUsername = encodeURIComponent(username);
  return serverGet<ListeningRecordListResult>(
    `/users/${encodedUsername}/listening-records?limit=${safeLimit}&offset=${safeOffset}`,
    { noAuth: true, revalidate: 0 },
  );
}

export async function loadMoreReviews(
  username: string,
  offset: number,
  limit: number,
): Promise<UserReviewListResult> {
  const { safeOffset, safeLimit } = validatePaginationParams(username, offset, limit);
  const encodedUsername = encodeURIComponent(username);
  return serverGet<UserReviewListResult>(
    `/users/${encodedUsername}/reviews?limit=${safeLimit}&offset=${safeOffset}`,
    { noAuth: true, revalidate: 0 },
  );
}
