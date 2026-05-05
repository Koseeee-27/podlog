/**
 * 旧モデルの Timeline ドメイン Data Access Layer (DAL)。
 *
 * 過渡期メモ: 新モデル（comment ベース）の DAL は `lib/data/comments.ts` の
 * `getTimeline` を使う。本ファイルの `getOldTimeline` は旧 review ベースの戻り型
 * （`{ reviews }` 形）を保ったままで、**podlog-workspace#59 の P-9 で削除予定**。
 *
 * BE の `/timeline` は既に新 comment ベースに切り替わっているため、`getOldTimeline`
 * を呼んでも `data.reviews` は undefined になる。P-8 で旧 timeline UI を新型に
 * 置き換えるまでの暫定。型としてビルドを通す目的で残している。
 *
 * `/timeline` は全ユーザー共通の公開 API。Authorization は付けず、
 * `revalidate: 60` + `timeline` タグでキャッシュする。
 */
import "server-only";
import { cache } from "react";
import { apiFetch } from "@/lib/api/fetch";
import type { OldTimelineResult } from "@/types/review";

/**
 * 全ユーザーの最新タイムラインを取得する（旧モデル、公開）。
 *
 * 過渡期メモ: 新モデルでは `lib/data/comments.ts::getTimeline` を使う。
 * `revalidate: 60` + `timeline` タグ（`revalidateTag("timeline")` で個別無効化可能）。
 * **podlog-workspace#59 の P-9 で削除予定**。
 */
export const getOldTimeline = cache(
  async (limit?: number, offset?: number): Promise<OldTimelineResult> => {
    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<OldTimelineResult>(`/timeline${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60, tags: ["timeline"] },
    });
  },
);
