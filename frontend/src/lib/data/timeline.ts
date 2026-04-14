/**
 * Timeline ドメインの Data Access Layer (DAL)。
 *
 * `/timeline` は全ユーザー共通の公開 API。Authorization は付けず、
 * `revalidate: 60` + `timeline` タグでキャッシュする。
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import type { TimelineResult } from "@/types/review";

/**
 * 全ユーザーのレビュータイムラインを取得する (公開)。
 * `revalidate: 60` + `timeline` タグ (`revalidateTag("timeline")` で個別無効化可能)。
 */
export const getTimeline = cache(
  async (limit?: number, offset?: number): Promise<TimelineResult> => {
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<TimelineResult>(`/timeline${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60, tags: ["timeline"] },
    });
  },
);
