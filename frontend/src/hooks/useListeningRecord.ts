"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addListeningRecord,
  removeListeningRecord,
  getListeningStatus,
  getMyListeningRecords,
} from "@/lib/api/listening-records";
import type { ListeningRecordItem } from "@/types/listening-record";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

const PAGE_SIZE = 20;

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

/**
 * ユーザーの聴取履歴一覧を管理するフック。
 */
export function useListeningRecords() {
  const [records, setRecords] = useState<ListeningRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getMyListeningRecords({ limit: PAGE_SIZE, offset: 0 });
        if (controller.signal.aborted) return;
        const list = data.records ?? [];
        setRecords(list);
        setTotal(data.total);
        setHasMore(list.length < data.total);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(getUserFriendlyErrorMessage(err));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetch();
    return () => { controller.abort(); };
  }, []);

  const recordsLength = records.length;
  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyListeningRecords({
        limit: PAGE_SIZE,
        offset: recordsLength,
      });
      const list = data.records ?? [];
      setRecords((prev) => [...prev, ...list]);
      setTotal(data.total);
      setHasMore(recordsLength + list.length < data.total);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [recordsLength]);

  return { records, total, loading, error, hasMore, loadMore };
}
