"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import {
  addListeningRecord,
  removeListeningRecord,
  getListeningStatus,
} from "@/lib/api/listening-records";
import { useToast } from "@/components/ui/Toast";
import ListenButtonView from "./ListenButtonView";

interface ListenButtonProps {
  episodeId: string;
  /**
   * 聴取状態の初期値。
   * - Server Component からデータを渡せる場合は必ず指定する（useEffect 不要になる）
   * - 省略した場合はクライアント側でフェッチする（公開ページ等の後方互換）
   */
  initialListened?: boolean;
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
 * - initialListened が提供された場合: useOptimistic で即時 UI 反映
 * - initialListened が省略された場合: マウント時にフェッチ（後方互換）
 * - トグル操作は useTransition で管理し、失敗時は楽観的更新をロールバック
 */
export default function ListenButton({
  episodeId,
  initialListened,
  onJustMarked,
  onUnmarked,
  compact,
}: ListenButtonProps) {
  // --- 初期値が未提供の場合のフォールバック fetch ---
  const [fetchedListened, setFetchedListened] = useState(false);
  const [isFetching, setIsFetching] = useState(initialListened === undefined);

  useEffect(() => {
    if (initialListened !== undefined) return;
    let cancelled = false;
    getListeningStatus(episodeId)
      .then((status) => {
        if (!cancelled) {
          setFetchedListened(status.listened);
          setIsFetching(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [episodeId, initialListened]);

  // --- 楽観的更新 + トグル ---
  const baseListened = initialListened ?? fetchedListened;
  const [optimisticListened, setOptimisticListened] =
    useOptimistic(baseListened);
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
        // 楽観的更新をロールバック（baseListened に戻る）
        showToast("操作に失敗しました");
      }
    });
  }

  return (
    <ListenButtonView
      listened={optimisticListened}
      loading={isFetching}
      toggling={isPending}
      onToggle={handleToggle}
      compact={compact}
    />
  );
}
