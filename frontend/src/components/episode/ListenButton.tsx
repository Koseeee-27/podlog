"use client";

import { useState, useOptimistic, useTransition } from "react";
import {
  addListeningRecord,
  removeListeningRecord,
} from "@/lib/api/listening-records";
import { useToast } from "@/components/ui/Toast";
import ListenButtonView from "./ListenButtonView";

interface ListenButtonProps {
  episodeId: string;
  /** 聴取状態の初期値。Server Component や API レスポンスから渡す */
  initialListened: boolean;
  /** 「聴いた」に記録した直後に呼ばれるコールバック */
  onJustMarked?: () => void;
  /** 聴取記録を取り消した直後に呼ばれるコールバック */
  onUnmarked?: () => void;
  /** true の場合、テキストなしのアイコンのみ小さいボタンを表示する */
  compact?: boolean;
}

/**
 * 聴取記録のトグルボタン。
 *
 * 状態管理の仕組み:
 * - confirmed: サーバーと同期済みの確定状態（useState）
 * - optimisticListened: ユーザーに見せる楽観的な状態（useOptimistic）
 *
 * ボタン押下 → optimistic を即座に反転 → API 呼び出し
 *   成功 → confirmed を更新（新しいベース値になる）
 *   失敗 → startTransition 終了で confirmed に自動ロールバック
 */
export default function ListenButton({
  episodeId,
  initialListened,
  onJustMarked,
  onUnmarked,
  compact,
}: ListenButtonProps) {
  const [confirmed, setConfirmed] = useState(initialListened);
  const [optimisticListened, toggleOptimistic] = useOptimistic(
    confirmed,
    (current) => !current,
  );
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleToggle() {
    const next = !optimisticListened;
    toggleOptimistic(undefined);

    startTransition(async () => {
      try {
        if (next) {
          await addListeningRecord(episodeId);
          onJustMarked?.();
        } else {
          await removeListeningRecord(episodeId);
          onUnmarked?.();
        }
        setConfirmed(next);
        showToast(
          next ? "聴取記録を追加しました" : "聴取記録を削除しました",
        );
      } catch {
        // confirmed は変更しない → startTransition 終了時に confirmed に自動ロールバック
        showToast("操作に失敗しました");
      }
    });
  }

  return (
    <ListenButtonView
      listened={optimisticListened}
      toggling={isPending}
      onToggle={handleToggle}
      compact={compact}
    />
  );
}
