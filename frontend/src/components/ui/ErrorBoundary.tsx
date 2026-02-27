"use client";

import { Component, ReactNode } from "react";
import ErrorMessage from "./ErrorMessage";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * React Error Boundary コンポーネント。
 * 子コンポーネントで発生した未処理のレンダリングエラーをキャッチし、
 * アプリ全体のクラッシュを防止する。
 *
 * Error Boundary は class コンポーネントでのみ実装可能（React の制約）。
 * getDerivedStateFromError でエラー状態を検知し、フォールバックUIを表示する。
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
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

    return this.props.children;
  }
}
