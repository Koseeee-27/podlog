"use server";

import { z } from "zod";
import { createProfileRequestSchema } from "@/lib/schemas/user";
import { createProfile } from "@/lib/data/me";
import { getViewer } from "@/lib/auth/getViewer";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

export interface ProfileFormState {
  success: boolean;
  error?: string;
  fieldErrors?: {
    username?: string;
    display_name?: string;
    bio?: string;
  };
}

/**
 * 初回プロフィール作成 Server Action。
 *
 * 認証チェックは `getViewer()` に統一している。`no_profile` は
 * 「ログイン済みだがプロフィール未作成」という状態のため、ここで受け入れる
 * (`/profile/setup` 画面から呼ばれる通常フロー)。`authenticated` の場合は
 * 既にプロフィールがあるので本来ここを呼ばない想定だが、安全側に倒して許容
 * している (二重作成はバックエンドが 409 を返すので最終的にはそちらで弾く)。
 */
export async function createProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const viewer = await getViewer();
  if (viewer.status === "guest") {
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
    await createProfile({
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
