"use server";

import { z } from "zod";
import { serverGet } from "@/lib/api/server";
import { usernameSchema } from "@/lib/schemas/common";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { UserReviewListResult } from "@/types/review";

/** 初回取得・追加取得で共通のページサイズ */
export const PAGE_SIZE = 10;

/**
 * Server Actions の入力バリデーション用スキーマ。
 * Server Actions は外部から任意の引数で呼ばれ得るため、
 * 不正な値でバックエンドに負荷をかけないよう検証する。
 */
const paginationSchema = z.object({
  username: usernameSchema,
  offset: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(100).default(PAGE_SIZE),
});

export async function loadMoreListeningRecords(
  username: string,
  offset: number,
  limit: number,
): Promise<ListeningRecordListResult> {
  const params = paginationSchema.parse({ username, offset, limit });
  const encodedUsername = encodeURIComponent(params.username);
  return serverGet<ListeningRecordListResult>(
    `/users/${encodedUsername}/listening-records?limit=${params.limit}&offset=${params.offset}`,
    { noAuth: true, revalidate: 0 },
  );
}

export async function loadMoreReviews(
  username: string,
  offset: number,
  limit: number,
): Promise<UserReviewListResult> {
  const params = paginationSchema.parse({ username, offset, limit });
  const encodedUsername = encodeURIComponent(params.username);
  return serverGet<UserReviewListResult>(
    `/users/${encodedUsername}/reviews?limit=${params.limit}&offset=${params.offset}`,
    { noAuth: true, revalidate: 0 },
  );
}
