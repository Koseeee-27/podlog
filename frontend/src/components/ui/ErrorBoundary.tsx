"use client";

import { Component, ErrorInfo, ReactNode, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ErrorMessage from "./ErrorMessage";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * React Error Boundary コンポーネント。
 * 子コンポーネントで発生した未処理のレンダリングエラーをキャッチし、
 * アプリ全体のクラッシュを防止する。
 *
 * Error Boundary は class コンポーネントでのみ実装可能（React の制約）。
 * class コンポーネントでは useRouter が使えないため、
 * ErrorBoundaryWrapper（関数コンポーネント）で router.refresh() を注入する。
 */

/**
 * ErrorBoundary のラッパー。
 * class コンポーネントでは hooks が使えないため、
 * 関数コンポーネントで router.refresh を取得して渡す。
 */
export default function ErrorBoundaryWrapper({ children, fallback }: ErrorBoundaryProps) {
  const router = useRouter();
  const [resetKey, setResetKey] = useState(0);

  const handleRetry = useCallback(() => {
    // サーバー側のデータを再取得させる
    router.refresh();
    // resetKey をインクリメントして ErrorBoundary の state をリセットし、
    // children を再マウントさせる
    setResetKey((prev) => prev + 1);
  }, [router]);

  return (
    <ErrorBoundaryInner
      key={resetKey}
      fallback={fallback}
      onRetry={handleRetry}
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
    // 本番環境ではここに外部エラー監視サービス（Sentry 等）への送信を追加する
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
          />
        </div>
      );
    }

    return this.props.children;
  }
}
