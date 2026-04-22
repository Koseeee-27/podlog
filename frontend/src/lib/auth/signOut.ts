"use client";

import * as Sentry from "@sentry/nextjs";
import type { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * `useRouter()` の戻り値型。Next.js の公式 API から導出する
 * (`next/dist/*` の内部モジュールを直接参照しないため)。
 */
type AppRouter = ReturnType<typeof useRouter>;

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
 *
 * エラーハンドリング:
 * `supabase.auth.signOut()` が失敗しても、UI としては `/login` に遷移させる。
 * signOut の内部エラー（ネットワーク断・Supabase 障害）はユーザーには
 * 対処のしようがないため、Sentry に通知して後追いできるようにしつつ、画面遷移は
 * 進める（セッションが端末に残り続けて「ログアウトできない」状態を避ける）。
 *
 * TODO: 共有端末でログアウト失敗時にユーザーが気づけないリスクがある。
 * Toast で「ログアウト処理に失敗しました」を表示する UX 改善は別 Issue で対応する。
 */
export async function signOut(router: AppRouter): Promise<void> {
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Sentry.captureException(error, { tags: { source: "signOut" } });
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { source: "signOut" } });
  }
  router.refresh();
  router.push("/login");
}
