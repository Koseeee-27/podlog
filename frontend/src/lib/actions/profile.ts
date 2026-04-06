"use server";

import { z } from "zod";
import { createProfileRequestSchema } from "@/lib/schemas/user";
import { serverPost } from "@/lib/api/server";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
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

export async function createProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  const raw = Object.fromEntries(formData);

  const result = createProfileRequestSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: ProfileFormState["fieldErrors"] = {};
    const flat = z.flattenError(result.error).fieldErrors;
    if (flat.username?.length) fieldErrors.username = flat.username[0];
    if (flat.display_name?.length) fieldErrors.display_name = flat.display_name[0];
    if (flat.bio?.length) fieldErrors.bio = flat.bio[0];
    return { success: false, fieldErrors };
  }

  try {
    await serverPost<User>("/users/profile", {
      ...result.data,
      bio: result.data.bio || undefined,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "プロフィールの作成に失敗しました"),
    };
  }
}
