import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import RecordClient from "./RecordClient";
import type { User } from "@/types/user";

export default async function RecordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // プロフィール未設定ならセットアップ画面へリダイレクト
  try {
    await serverGet<User>("/users/me");
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      redirect("/profile/setup");
    }
    throw err;
  }

  return <RecordClient />;
}
