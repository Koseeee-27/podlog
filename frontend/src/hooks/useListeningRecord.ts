"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addListeningRecord,
  removeListeningRecord,
  getListeningStatus,
  getMyListeningRecords,
} from "@/lib/api/listening-records";
import type { ListeningRecordItem } from "@/types/listening-record";

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

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const status = await getListeningStatus(episodeId);
        if (!cancelled) setListened(status.listened);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [episodeId]);

  const toggle = useCallback(async () => {
    setToggling(true);
    setError(null);
    try {
      if (listened) {
        await removeListeningRecord(episodeId);
        setListened(false);
      } else {
        await addListeningRecord(episodeId);
        setListened(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作に失敗しました");
    } finally {
      setToggling(false);
    }
  }, [episodeId, listened]);

  return { listened, loading, toggling, error, toggle };
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
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getMyListeningRecords({ limit: PAGE_SIZE, offset: 0 });
        if (!cancelled) {
          setRecords(data.records ?? []);
          setTotal(data.total);
          setHasMore((data.records ?? []).length >= PAGE_SIZE);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
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
      setHasMore(list.length >= PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込み失敗");
    } finally {
      setLoading(false);
    }
  }, [recordsLength]);

  return { records, total, loading, error, hasMore, loadMore };
}
