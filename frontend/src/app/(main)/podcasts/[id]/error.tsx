"use client";

import ErrorMessage from "@/components/ui/ErrorMessage";

interface PodcastErrorProps {
  error: Error;
  reset: () => void;
}

/**
 * /podcasts/[id] のエラーバウンダリ。
 * ポッドキャスト詳細の取得失敗時にページ全体のクラッシュを防ぎ、
 * 再試行ボタンを表示する。
 */
export default function PodcastError({ reset }: PodcastErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-8">
      <ErrorMessage
        message="ポッドキャストの読み込みに失敗しました。再試行してください。"
        onRetry={reset}
      />
    </div>
  );
}
