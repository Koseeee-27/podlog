"use client";

import { Component, ErrorInfo, ReactNode, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import ErrorMessage from "./ErrorMessage";

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * エラー時に表示する要素。
   * - 省略（undefined）: デフォルトのエラー UI（メッセージ + 再試行ボタン）を表示
   * - `null`: エラー時に何も表示しない（認証依存ボタンなど「失敗したら消したい」場合）
   * - ReactNode: 指定した要素を表示
   */
  fallback?: ReactNode;
}

/**
 * React Error Boundary コンポーネント。
 * 子コンポーネントで発生した未処理のレンダリングエラーをキャッチし、
 * アプリ全体のクラッシュを防止する。
 *
 * Error Boundary は class コンポーネントでのみ実装可能（React の制約）。
 * class コンポーネントでは useRouter が使えないため、
 * 関数コンポーネント（ErrorBoundary）で router.refresh() を注入する。
 *
 * リトライ時は startTransition 内で router.refresh() + key 変更を行う。
 * startTransition で更新を遷移として扱い、isPending で再試行中の状態を
 * 表示できるようにする。router.refresh() が RSC ペイロードを再取得し、
 * key 変更で ErrorBoundaryInner を再マウントしてエラー状態をリセットする。
 */
export default function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const router = useRouter();
  const [resetKey, setResetKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(() => {
      // サーバー側の RSC ペイロードを再取得させる
      router.refresh();
      // key を変更して ErrorBoundaryInner を再マウントし、エラー状態をリセットする
      setResetKey((prev) => prev + 1);
    });
  };

  return (
    <ErrorBoundaryInner
      key={resetKey}
      fallback={fallback}
      onRetry={handleRetry}
      isPending={isPending}
    >
      {children}
    </ErrorBoundaryInner>
  );
}

// --- 内部クラスコンポーネント ---

interface ErrorBoundaryInnerProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry: () => void;
  isPending: boolean;
}

class ErrorBoundaryInner extends Component<ErrorBoundaryInnerProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryInnerProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Server Component で throw されたエラーは、RSC ペイロード経由でクライアントに
    // 流れ着くと Next.js が `digest` プロパティを付与する。この場合、サーバー側で
    // `instrumentation.ts` の `onRequestError` が既に Sentry に送信済みなので、
    // ここで再送信すると二重計上になる（無料枠を無駄に消費する）。
    // digest がある = Server 発のエラー → Sentry 送信はスキップし、console だけ残す。
    // digest が無い = 純粋な Client render エラー → Sentry に送信する。
    const digest = (error as { digest?: string }).digest;
    if (!digest) {
      Sentry.withScope((scope) => {
        scope.setContext("errorInfo", { componentStack: errorInfo.componentStack });
        Sentry.captureException(error);
      });
    }

    // 既存の console.error はローカル開発でのデバッグ用に常時維持する。
    console.error("[ErrorBoundary] Uncaught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // fallback={null} は「エラー時に何も表示しない」を意味する。
      // undefined（未指定）と区別するために !== undefined で判定する。
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return (
        <div className="flex items-center justify-center min-h-[200px] p-8">
          <ErrorMessage
            message="予期しないエラーが発生しました。再試行してください。"
            onRetry={this.props.onRetry}
            isPending={this.props.isPending}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
