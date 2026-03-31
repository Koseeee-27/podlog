"use client";

import { useCallback } from "react";
import { useListeningStatus } from "@/hooks/useListeningRecord";
import { useToast } from "@/components/ui/Toast";
import ListenButtonView from "./ListenButtonView";

interface ListenButtonProps {
  episodeId: string;
  /** 「聴いた」に記録した直後に呼ばれるコールバック */
  onJustMarked?: () => void;
  /** 聴取記録を取り消した直後に呼ばれるコールバック */
  onUnmarked?: () => void;
  /** true の場合、テキストなしのアイコンのみ小さいボタンを表示する */
  compact?: boolean;
}

export default function ListenButton({ episodeId, onJustMarked, onUnmarked, compact }: ListenButtonProps) {
  const { listened, loading, toggling, error, toggle } = useListeningStatus(episodeId);
  const { showToast } = useToast();

  const handleToggle = useCallback(async () => {
    const wasListened = listened;
    const success = await toggle();
    if (success) {
      showToast(wasListened ? "聴取記録を削除しました" : "聴取記録を追加しました");
      if (wasListened) {
        onUnmarked?.();
      } else {
        onJustMarked?.();
      }
    }
  }, [listened, toggle, showToast, onJustMarked, onUnmarked]);

  return (
    <ListenButtonView
      listened={listened}
      loading={loading}
      toggling={toggling}
      error={error}
      onToggle={handleToggle}
      compact={compact}
    />
  );
}
