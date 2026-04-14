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
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createClient } from "@/lib/supabase/client";

export async function signOut(router: AppRouterInstance): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  router.refresh();
  router.push("/login");
}
