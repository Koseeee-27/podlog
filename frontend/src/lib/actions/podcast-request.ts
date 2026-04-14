"use server";

import { z } from "zod";
import { podcastRequestFormSchema } from "@/lib/schemas/podcast-request";
import { createPodcastRequest } from "@/lib/data/podcast-requests";
import { getViewer } from "@/lib/auth/getViewer";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

export interface PodcastRequestFormState {
  success: boolean;
  error?: string;
  fieldErrors?: {
    title?: string;
    url?: string;
  };
}

/**
 * 番組追加リクエスト Server Action。
 *
 * 認証チェックは `getViewer()` に統一している。`authenticated` のみ許可する
 * (番組リクエストはプロフィール作成済みユーザーに限定するため、`no_profile`
 * は拒否する)。
 */
export async function submitPodcastRequestAction(
  _prevState: PodcastRequestFormState,
  formData: FormData,
): Promise<PodcastRequestFormState> {
  const viewer = await getViewer();
  if (viewer.status !== "authenticated") {
    return { success: false, error: "ログインが必要です" };
  }

  const raw = Object.fromEntries(formData);

  const result = podcastRequestFormSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: PodcastRequestFormState["fieldErrors"] = {};
    const flat = z.flattenError(result.error).fieldErrors;
    if (flat.title?.length) fieldErrors.title = flat.title[0];
    if (flat.url?.length) fieldErrors.url = flat.url[0];
    return { success: false, fieldErrors };
  }

  try {
    await createPodcastRequest({
      title: result.data.title,
      url: result.data.url || undefined,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "送信に失敗しました"),
    };
  }
}
