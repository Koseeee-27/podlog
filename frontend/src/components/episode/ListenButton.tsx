"use client";

import { useOptimistic, useTransition } from "react";
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
 * - useOptimistic でボタン押下時に即座に UI を切り替える
 * - useTransition でトグル操作を管理し、失敗時はロールバック
 * - 初期値は必ず親から受け取る（コンポーネント内でのデータフェッチは行わない）
 */
export default function ListenButton({
  episodeId,
  initialListened,
  onJustMarked,
  onUnmarked,
  compact,
}: ListenButtonProps) {
  const [optimisticListened, setOptimisticListened] =
    useOptimistic(initialListened);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleToggle() {
    const next = !optimisticListened;
    setOptimisticListened(next);

    startTransition(async () => {
      try {
        if (next) {
          await addListeningRecord(episodeId);
          onJustMarked?.();
        } else {
          await removeListeningRecord(episodeId);
          onUnmarked?.();
        }
        showToast(
          next ? "聴取記録を追加しました" : "聴取記録を削除しました",
        );
      } catch {
        // 楽観的更新をロールバック（initialListened に戻る）
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
