"use client";

/**
 * 共通のログアウト処理。
 *
 * Navbar / SettingsClient など複数の Client Component から呼び出される。
 * 以前は各コンポーネントで `createBrowserClient().auth.signOut()` +
 * `router.refresh()` / `router.push("/login")` のシーケンスをそれぞれ
 * 書いていたが、将来 Sentry 通知や Analytics イベントを追加するときに
 * 複数箇所の修正が必要になるため、本関数に集約する。
 *
 * 使い方:
 * ```tsx
 * const router = useRouter();
 * await signOut(router);
 * ```
 *
 * `router.refresh()` で Server Component ツリーを再実行して `getViewer()` を
 * guest 状態で再評価させ、その後 `/login` に遷移する。
 */
import type { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * `useRouter()` の戻り値型。Next.js の公式 API から導出する
 * (`next/dist/*` の内部モジュールを直接参照しないため)。
 */
type AppRouter = ReturnType<typeof useRouter>;

export async function signOut(router: AppRouter): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  router.refresh();
  router.push("/login");
}
