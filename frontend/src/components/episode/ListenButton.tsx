"use client";

import { useEffect, useRef } from "react";
import { useListeningStatus } from "@/hooks/useListeningRecord";
import ListenButtonView from "./ListenButtonView";

interface ListenButtonProps {
  episodeId: string;
  /** 「聴いた」に記録した直後に呼ばれるコールバック */
  onJustMarked?: () => void;
  /** 聴取記録を取り消した直後に呼ばれるコールバック */
  onUnmarked?: () => void;
}

export default function ListenButton({ episodeId, onJustMarked, onUnmarked }: ListenButtonProps) {
  const { listened, loading, toggling, error, toggle, justMarked, clearJustMarked } =
    useListeningStatus(episodeId);

  const onJustMarkedRef = useRef(onJustMarked);
  const onUnmarkedRef = useRef(onUnmarked);
  const prevListenedRef = useRef(listened);

  useEffect(() => {
    onJustMarkedRef.current = onJustMarked;
    onUnmarkedRef.current = onUnmarked;
  }, [onJustMarked, onUnmarked]);

  useEffect(() => {
    if (justMarked) {
      onJustMarkedRef.current?.();
      clearJustMarked();
    }
  }, [justMarked, clearJustMarked]);

  // 聴取記録が取り消された（true → false）時にコールバックを呼ぶ
  useEffect(() => {
    if (prevListenedRef.current && !listened && !loading) {
      onUnmarkedRef.current?.();
    }
    prevListenedRef.current = listened;
  }, [listened, loading]);

  return (
    <ListenButtonView
      listened={listened}
      loading={loading}
      toggling={toggling}
      error={error}
      onToggle={toggle}
    />
  );
}
