"use client";

import { useListeningStatus } from "@/hooks/useListeningRecord";
import ListenButtonView from "./ListenButtonView";

interface ListenButtonProps {
  episodeId: string;
}

export default function ListenButton({ episodeId }: ListenButtonProps) {
  const { listened, loading, toggling, error, toggle } = useListeningStatus(episodeId);

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
