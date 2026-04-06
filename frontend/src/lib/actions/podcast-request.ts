"use server";

import { z } from "zod";
import { podcastRequestFormSchema } from "@/lib/schemas/podcast-request";
import { serverPost } from "@/lib/api/server";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { PodcastRequestResult } from "@/types/podcast-request";

export interface PodcastRequestFormState {
  success: boolean;
  error?: string;
  fieldErrors?: {
    title?: string;
    url?: string;
  };
}

export async function submitPodcastRequestAction(
  _prevState: PodcastRequestFormState,
  formData: FormData,
): Promise<PodcastRequestFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
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
    await serverPost<PodcastRequestResult>("/podcasts/request", {
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
