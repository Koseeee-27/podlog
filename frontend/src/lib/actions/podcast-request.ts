"use server";

import { podcastRequestFormSchema } from "@/lib/schemas/podcast-request";
import { serverPost } from "@/lib/api/server";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import type { PodcastRequestResult } from "@/types/podcast-request";

export interface PodcastRequestFormState {
  success: boolean;
  error?: string;
  fieldErrors?: {
    title?: string;
    url?: string;
  };
}

export const podcastRequestFormInitialState: PodcastRequestFormState = {
  success: false,
};

export async function submitPodcastRequestAction(
  _prevState: PodcastRequestFormState,
  formData: FormData,
): Promise<PodcastRequestFormState> {
  const raw = {
    title: (formData.get("title") as string)?.trim(),
    url: (formData.get("url") as string)?.trim(),
  };

  const result = podcastRequestFormSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: PodcastRequestFormState["fieldErrors"] = {};
    const flat = result.error.flatten().fieldErrors;
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
