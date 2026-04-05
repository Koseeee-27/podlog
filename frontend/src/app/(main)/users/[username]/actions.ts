"use server";

import { serverGet } from "@/lib/api/server";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { UserReviewListResult } from "@/types/review";

export async function loadMoreListeningRecords(
  username: string,
  offset: number,
  limit: number,
): Promise<ListeningRecordListResult> {
  const encodedUsername = encodeURIComponent(username);
  return serverGet<ListeningRecordListResult>(
    `/users/${encodedUsername}/listening-records?limit=${limit}&offset=${offset}`,
    { noAuth: true, revalidate: 0 },
  );
}

export async function loadMoreReviews(
  username: string,
  offset: number,
  limit: number,
): Promise<UserReviewListResult> {
  const encodedUsername = encodeURIComponent(username);
  return serverGet<UserReviewListResult>(
    `/users/${encodedUsername}/reviews?limit=${limit}&offset=${offset}`,
    { noAuth: true, revalidate: 0 },
  );
}
