"use client";

import ErrorMessage from "@/components/ui/ErrorMessage";

interface EpisodeErrorProps {
  error: Error;
  reset: () => void;
}

/**
 * /episodes/[id] のエラーバウンダリ。
 * エピソード詳細の取得失敗時にページ全体のクラッシュを防ぎ、
 * 再試行ボタンを表示する。
 */
export default function EpisodeError({ reset }: EpisodeErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-8">
      <ErrorMessage
        message="エピソードの読み込みに失敗しました。再試行してください。"
        onRetry={reset}
      />
    </div>
  );
}
