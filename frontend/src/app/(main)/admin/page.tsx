import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import AdminClient from "./AdminClient";
import type { User } from "@/types/user";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未認証はホームにリダイレクト（middleware でも処理されるがフォールバック）
  if (!user) {
    redirect("/login");
  }

  let profile: User | null = null;
  try {
    profile = await serverGet<User>("/users/me");
  } catch {
    redirect("/login");
  }

  // 管理者でなければホームにリダイレクト（認証済みだが権限不足）
  if (!profile?.is_admin) {
    redirect("/");
  }

  return <AdminClient />;
}
