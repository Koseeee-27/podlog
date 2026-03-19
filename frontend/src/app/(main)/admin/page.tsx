import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import AdminClient from "./AdminClient";
import type { User } from "@/types/user";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未認証はログインにリダイレクト（middleware でも処理されるがフォールバック）
  if (!user) {
    redirect("/login");
  }

  let profile: User | null = null;
  try {
    profile = await serverGet<User>("/users/me");
  } catch (err) {
    // 401/403 はログインへ、404 はプロフィール未設定
    if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
      redirect("/login");
    }
    if (err instanceof ApiRequestError && err.status === 404) {
      redirect("/profile/setup");
    }
    // その他のエラー（500等）は throw して Next.js エラーページに任せる
    throw err;
  }

  // 管理者でなければホームにリダイレクト（認証済みだが権限不足）
  if (!profile?.is_admin) {
    redirect("/");
  }

  return <AdminClient />;
}
