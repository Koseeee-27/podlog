"use server";

import { createProfileRequestSchema } from "@/lib/schemas/user";
import { serverPost } from "@/lib/api/server";
import type { User } from "@/types/user";

export interface ProfileFormState {
  success: boolean;
  error?: string;
  fieldErrors?: {
    username?: string;
    display_name?: string;
    bio?: string;
  };
}

export const profileFormInitialState: ProfileFormState = { success: false };

export async function createProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const raw = {
    username: (formData.get("username") as string)?.trim(),
    display_name: (formData.get("display_name") as string)?.trim(),
    bio: (formData.get("bio") as string)?.trim() || undefined,
  };

  const result = createProfileRequestSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: ProfileFormState["fieldErrors"] = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (field === "username" || field === "display_name" || field === "bio") {
        fieldErrors[field] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  try {
    await serverPost<User>("/users/profile", result.data);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "プロフィールの作成に失敗しました",
    };
  }
}
