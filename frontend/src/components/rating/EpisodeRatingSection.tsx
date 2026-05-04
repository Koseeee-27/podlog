"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import RatingForm from "./RatingForm";
import MyRatingCard from "./MyRatingCard";
import LoginPromptButton from "@/components/ui/LoginPromptButton";
import { useToast } from "@/components/ui/Toast";
import {
  createRatingAction,
  updateRatingAction,
  deleteRatingAction,
} from "@/lib/actions/rating";
import type {
  EpisodeRatingResult,
  MyRatingResult,
} from "@/types/rating";

interface EpisodeRatingSectionProps {
  episodeId: string;
  /** Server Component から渡される評価集計（平均・件数・分布） */
  episodeStats: EpisodeRatingResult;
  /** 自分の評価（未ログイン or 未投稿なら null） */
  myRating: MyRatingResult | null;
  /** Server Component で判定済みのログイン状態 */
  isLoggedIn: boolean;
}

/**
 * エピソード詳細ページの評価セクション（コンパクト表示）。
 *
 * `screens.md` L609-612 の「評価セクション（コンパクト）」仕様に対応:
 *  - 平均評価 ★X.X（評価 N 件）の表示
 *  - 自分の評価入力 UI（未ログイン/未投稿/投稿済みで分岐）
 *  - 投稿済みの場合は編集・削除ボタン（評価のみ削除、感想は残る）
 *
 * 投稿/更新/削除成功時は `router.refresh()` で Server Component を再実行し、
 * `episodeStats` と `myRating` を最新の値に更新する。client state で
 * 楽観的更新する設計と比較して、平均値や件数の計算ミスが起きないため
 * MVP ではこちらを採用（`getEpisodeRating` は `revalidate: 0` なので
 * `router.refresh()` で必ず最新値が取得される）。
 */
export default function EpisodeRatingSection({
  episodeId,
  episodeStats,
  myRating,
  isLoggedIn,
}: EpisodeRatingSectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const { showToast } = useToast();

  const boundCreateAction = createRatingAction.bind(null, episodeId);
  const boundUpdateAction = updateRatingAction.bind(null, episodeId);

  function handleCreateSuccess() {
    showToast("評価を投稿しました");
    router.refresh();
  }

  function handleUpdateSuccess() {
    setEditing(false);
    showToast("評価を更新しました");
    router.refresh();
  }

  function handleDelete() {
    startDelete(async () => {
      setDeleteError(null);
      const result = await deleteRatingAction(episodeId);
      if (result.success) {
        setConfirmDelete(false);
        showToast("評価を削除しました");
        router.refresh();
      } else {
        setDeleteError(result.error ?? "評価の削除に失敗しました");
      }
    });
  }

  // 自分の評価入力 / 表示 / 編集 UI の分岐。
  // 直接 JSX 内で if-else チェーンを書くと読みづらいため、関数に切り出す。
  // クロージャで state を参照するため `EpisodeRatingSection` 内に置く。
  function renderRatingArea() {
    if (!isLoggedIn) {
      return <LoginPromptButton label="ログインして評価する" />;
    }

    if (editing && myRating) {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4">
          <RatingForm
            action={boundUpdateAction}
            initialRating={myRating.rating}
            submitLabel="更新する"
            onSuccess={handleUpdateSuccess}
          />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="mt-3 text-sm text-stone-500 hover:text-stone-700"
          >
            キャンセル
          </button>
        </div>
      );
    }

    if (myRating) {
      return (
        <>
          <MyRatingCard
            rating={myRating}
            onEdit={() => setEditing(true)}
            onStartDelete={() => setConfirmDelete(true)}
            confirmDelete={confirmDelete}
            onConfirmDelete={handleDelete}
            onCancelDelete={() => setConfirmDelete(false)}
            actionLoading={isDeleting}
          />
          {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
        </>
      );
    }

    return (
      <RatingForm
        action={boundCreateAction}
        submitLabel="投稿する"
        onSuccess={handleCreateSuccess}
      />
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-stone-900">評価</h2>

      {/* 平均評価サマリー（screens.md: 平均評価 ★X.X（評価 N 件）） */}
      {episodeStats.total_ratings > 0 ? (
        <div className="flex items-center gap-2 text-sm text-stone-700">
          <span className="text-yellow-500" aria-hidden="true">★</span>
          <span className="font-semibold text-stone-900">
            {episodeStats.average_rating.toFixed(1)}
          </span>
          <span className="text-stone-500">
            （評価 {episodeStats.total_ratings} 件）
          </span>
        </div>
      ) : (
        <p className="text-sm text-stone-500">まだ評価がありません</p>
      )}

      {/* 自分の評価入力 / 表示 / 編集 UI */}
      {renderRatingArea()}
    </section>
  );
}
