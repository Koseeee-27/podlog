"use client";

import { useState } from "react";
import PodcastRequestDialog from "@/components/discover/PodcastRequestDialog";
import LoginPromptButton from "@/components/ui/LoginPromptButton";
import { PlusCircleIcon } from "@heroicons/react/24/outline";

interface PodcastRequestPromptProps {
  /** 呼び出し側 (page.tsx 等) が `getViewer()` を使って解決したログイン状態。 */
  isLoggedIn: boolean;
}

/**
 * 検索結果が 0 件のときに表示する「番組追加をリクエスト」プロンプト。
 * ログイン状態は Server Component で確定させて props で受け取り、
 * このコンポーネント自体では認証フックを使わない。
 */
export default function PodcastRequestPrompt({
  isLoggedIn,
}: PodcastRequestPromptProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="mt-6 border border-stone-200 rounded-xl p-5 text-center">
        <p className="text-sm font-medium text-stone-700">
          お探しの番組が見つかりませんか？
        </p>
        <p className="mt-1 text-xs text-stone-500">
          番組の追加をリクエストできます
        </p>
        <div className="mt-4">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
            >
              <PlusCircleIcon className="h-5 w-5" />
              番組追加をリクエストする
            </button>
          ) : (
            <LoginPromptButton label="ログインしてリクエストする" />
          )}
        </div>
      </div>

      <PodcastRequestDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
