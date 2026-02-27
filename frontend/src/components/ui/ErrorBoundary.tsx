"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import ErrorMessage from "./ErrorMessage";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  resetKey: number;
}

/**
 * React Error Boundary コンポーネント。
 * 子コンポーネントで発生した未処理のレンダリングエラーをキャッチし、
 * アプリ全体のクラッシュを防止する。
 *
 * Error Boundary は class コンポーネントでのみ実装可能（React の制約）。
 * - getDerivedStateFromError: フォールバック UI を表示するためにエラー状態を更新
 * - componentDidCatch: エラーログの記録（本番デバッグ・モニタリング用）
 *
 * リトライ時は resetKey をインクリメントすることで children を新しいインスタンスとして
 * 再マウントさせ、同じ props/state による無限エラーループを防止する。
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, resetKey: 0 };
  }

  static getDerivedStateFromError(): Pick<ErrorBoundaryState, "hasError"> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 本番環境ではここに外部エラー監視サービス（Sentry 等）への送信を追加する
    console.error("[ErrorBoundary] Uncaught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  private handleRetry = () => {
    // resetKey をインクリメントして children を再マウントさせる。
    // 単に hasError: false にするだけだと、同じ props/state で再レンダリングされ
    // 無限エラーループに陥る可能性がある。
    this.setState((prev) => ({ hasError: false, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex items-center justify-center min-h-[200px] p-8">
          <ErrorMessage
            message="予期しないエラーが発生しました。再試行してください。"
            onRetry={this.handleRetry}
          />
        </div>
      );
    }

    // key を変えることで React が children を完全に再マウント（新しいインスタンスを作成）する。
    // これにより内部状態がリセットされ、同じエラーの無限ループを防止する。
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
