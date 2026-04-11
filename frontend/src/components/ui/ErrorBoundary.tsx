"use client";

import { Component, ErrorInfo, ReactNode, useTransition, useState } from "react";
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
 * 関数コンポーネント（ErrorBoundary）で router.refresh() を注入する。
 *
 * リトライ時は startTransition 内で router.refresh() + key 変更を行う。
 * startTransition によって React はサーバーの応答を待ってから UI を更新するため、
 * 古い（エラーの）RSC ペイロードが再利用される問題を防止する。
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
            isPending={this.props.isPending}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
