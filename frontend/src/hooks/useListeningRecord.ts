"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addListeningRecord,
  removeListeningRecord,
  getListeningStatus,
} from "@/lib/api/listening-records";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

/**
 * エピソードの聴取状態を管理するフック。
 * 「聴いた」ボタンのトグル操作に使用します。
 */
export function useListeningStatus(episodeId: string) {
  const [listened, setListened] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justMarked, setJustMarked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const status = await getListeningStatus(episodeId);
        if (!cancelled) setListened(status.listened);
      } catch (err) {
        if (!cancelled) setError(getUserFriendlyErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [episodeId]);

  const toggle = useCallback(async (): Promise<boolean> => {
    setToggling(true);
    setError(null);
    try {
      if (listened) {
        await removeListeningRecord(episodeId);
        setListened(false);
        setJustMarked(false);
      } else {
        await addListeningRecord(episodeId);
        setListened(true);
        setJustMarked(true);
      }
      return true;
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, "操作に失敗しました"));
      return false;
    } finally {
      setToggling(false);
    }
  }, [episodeId, listened]);

  const clearJustMarked = useCallback(() => {
    setJustMarked(false);
  }, []);

  return { listened, loading, toggling, error, toggle, justMarked, clearJustMarked };
}
