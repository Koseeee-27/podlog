import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecordClient from "./RecordClient";

export default async function RecordPage() {
  // Middleware で未認証リダイレクト済みだが、防御的に二重チェック
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // プロフィール未設定チェックは RecordClient 側の useAuth で行う

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">記録する</h1>
      <RecordClient />
    </div>
  );
}
