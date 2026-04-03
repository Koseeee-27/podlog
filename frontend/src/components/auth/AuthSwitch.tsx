"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

interface AuthSwitchProps {
  /** ログイン済み（プロフィール設定済み）のときに表示する内容 */
  authenticated?: ReactNode;
  /** 未ログインのときに表示する内容 */
  unauthenticated?: ReactNode;
  /** ローディング中に表示する内容（省略時は何も表示しない） */
  loading?: ReactNode;
}

/**
 * 認証状態に応じて表示を切り替える Client Component。
 * Server Component 内で使用し、認証状態による条件分岐を page.tsx から排除する。
 */
export default function AuthSwitch({
  authenticated,
  unauthenticated,
  loading: loadingFallback,
}: AuthSwitchProps) {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <>{loadingFallback}</>;
  }

  if (auth.status === "authenticated") {
    return <>{authenticated}</>;
  }

  return <>{unauthenticated}</>;
}
