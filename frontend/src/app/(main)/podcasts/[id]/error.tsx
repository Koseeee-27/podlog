"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import ErrorMessage from "@/components/ui/ErrorMessage";

interface PodcastErrorProps {
  error: Error;
  reset: () => void;
}

/**
 * /podcasts/[id] のエラーバウンダリ。
 * ポッドキャスト詳細の取得失敗時にページ全体のクラッシュを防ぎ、
 * 再試行ボタンを表示する。
 *
 * reset() だけではキャッシュされた RSC ペイロードが再利用されるため、
 * router.refresh() でサーバー側のキャッシュを破棄してから reset() を呼ぶ。
 */
export default function PodcastError({ reset }: PodcastErrorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="flex items-center justify-center min-h-[200px] p-8">
      <ErrorMessage
        message="ポッドキャストの読み込みに失敗しました。再試行してください。"
        onRetry={handleRetry}
        isPending={isPending}
      />
    </div>
  );
}
