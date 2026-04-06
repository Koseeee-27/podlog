"use server";

import { uuidSchema } from "@/lib/schemas/common";
import { serverPost } from "@/lib/api/server";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { FetchFromFeedResult } from "@/types/episode";

export interface FetchFromFeedState {
  success: boolean;
  error?: string;
  newCount?: number;
}

export async function fetchFromFeedAction(
  podcastId: string,
): Promise<FetchFromFeedState> {
  if (!uuidSchema.safeParse(podcastId).success) {
    return { success: false, error: "無効なポッドキャストIDです" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  try {
    const result = await serverPost<FetchFromFeedResult>(
      `/podcasts/${encodeURIComponent(podcastId)}/episodes/fetch`,
    );
    return { success: true, newCount: result.new_count };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "RSSフィードの取得に失敗しました"),
    };
  }
}
