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
    redirect("/");
  }

  let profile: User | null = null;
  try {
    profile = await serverGet<User>("/users/me");
  } catch {
    redirect("/");
  }

  // 管理者でなければホームにリダイレクト
  if (!profile?.is_admin) {
    redirect("/");
  }

  return <AdminClient />;
}
