"use client";

import { useCallback } from "react";
import { useListeningStatus } from "@/hooks/useListeningRecord";
import { useToast } from "@/components/ui/Toast";
import ListenButtonView from "./ListenButtonView";

interface ListenButtonProps {
  episodeId: string;
}

export default function ListenButton({ episodeId }: ListenButtonProps) {
  const { listened, loading, toggling, error, toggle } = useListeningStatus(episodeId);
  const { showToast } = useToast();

  const handleToggle = useCallback(async () => {
    const wasListened = listened;
    const success = await toggle();
    if (success) {
      showToast(wasListened ? "聴取記録を削除しました" : "聴取記録を追加しました");
    }
  }, [listened, toggle, showToast]);

  return (
    <ListenButtonView
      listened={listened}
      loading={loading}
      toggling={toggling}
      error={error}
      onToggle={handleToggle}
    />
  );
}
