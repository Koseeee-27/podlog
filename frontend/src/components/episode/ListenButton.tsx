"use client";

import { useEffect, useRef } from "react";
import { useListeningStatus } from "@/hooks/useListeningRecord";
import ListenButtonView from "./ListenButtonView";

interface ListenButtonProps {
  episodeId: string;
  /** 「聴いた」に記録した直後に呼ばれるコールバック */
  onJustMarked?: () => void;
}

export default function ListenButton({ episodeId, onJustMarked }: ListenButtonProps) {
  const { listened, loading, toggling, error, toggle, justMarked, clearJustMarked } =
    useListeningStatus(episodeId);

  const onJustMarkedRef = useRef(onJustMarked);

  useEffect(() => {
    onJustMarkedRef.current = onJustMarked;
  }, [onJustMarked]);

  useEffect(() => {
    if (justMarked) {
      onJustMarkedRef.current?.();
      clearJustMarked();
    }
  }, [justMarked, clearJustMarked]);

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
