"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import CommentForm from "@/components/comment/CommentForm";
import CommentCard from "@/components/comment/CommentCard";
import MyCommentCard from "@/components/comment/MyCommentCard";
import {
  createCommentAction,
  updateCommentAction,
  deleteCommentAction,
} from "@/lib/actions/comment";
import { fetchEpisodeComments } from "@/lib/api/comments";
import { getUserFriendlyErrorMessage } from "@/lib/utils";
import type { Comment, EpisodeCommentItem } from "@/types/comment";
import type { Viewer } from "@/lib/auth/getViewer";
import { COMMENT_PAGE_SIZE } from "./constants";

interface Props {
  episodeId: string;
  initialComments: EpisodeCommentItem[];
  initialTotal: number;
  viewer: Viewer;
}

/**
 * エピソード詳細ページの感想セクション本体（Client Component）。
 *
 * 評価/感想分離（podlog-workspace#59）の P-8 で追加。1 ユーザーが同一エピソードに
 * 複数件の感想を投稿できる新モデル仕様（`requirements.md` 3.6）に合わせて、
 * 「投稿フォーム + 全件時系列リスト（自分の感想は編集・削除メニュー付き）+
 *  もっと見る」の UI を 1 コンポーネントにまとめている。
 *
 * 設計の要点:
 *
 * - **共通プレゼンテーション `CommentList` は採用しない**: 自分の感想だけ
 *   `MyCommentCard`（編集・削除メニュー付き）で表示する必要があり、汎用 `CommentList`
 *   ではアイテム単位のカスタムが扱いづらい。本セクション内で直接 map する方が
 *   読みやすい。`CommentList` は将来「閲覧専用の感想リスト」が必要になったときの
 *   共通部品として残す。
 * - **編集モード**: 編集ボタンを押すと該当カードが `CommentForm`（初期値 = 本文）に
 *   切り替わる。`updateCommentAction` の成功時に表示モードに戻す。
 * - **削除モード**: `MyCommentCard` 内蔵の 2 段階削除フローを使う（「削除する」→
 *   「本当に削除しますか？」→ 確定）。確定時に `deleteCommentAction` を呼ぶ。
 * - **連投時の楽観的反映**: 投稿成功時に viewer.profile から `CommentUser` を組み立て、
 *   新しい `EpisodeCommentItem` をリスト先頭に追加。total も +1。サーバーから返る
 *   `Comment` には `user` 情報が含まれないため、ここで合成する必要がある。
 * - **「もっと見る」**: `fetchEpisodeComments` で追加取得。`useTransition` の
 *   `isPending` で連打防止（FE 規約）。total はサーバー値で更新し、hasMore 判定を
 *   正確に保つ。
 * - **未ログイン時**: 投稿フォームの代わりに「ログインして感想を書く」CTA を表示。
 *   リスト自体は閲覧可能（`requirements.md` 4.1 のフルオープン型方針）。
 */
export default function EpisodeCommentSectionClient({
  episodeId,
  initialComments,
  initialTotal,
  viewer,
}: Props) {
  const [comments, setComments] =
    useState<EpisodeCommentItem[]>(initialComments);
  const [total, setTotal] = useState(initialTotal);
  // 編集モード切替対象の commentId。同時に複数編集はしない（1 件ずつ）
  const [editingId, setEditingId] = useState<string | null>(null);
  // 2 段階削除フローの確認待ち中の commentId
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // 削除アクション実行中（API コール中）の commentId。MyCommentCard の actionLoading
  // を立てるために使う
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // アクション全般のエラー文言（編集失敗 / 削除失敗 / もっと見る失敗）
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoadMorePending, startLoadMore] = useTransition();

  const isLoggedIn = viewer.status === "authenticated";
  const myId = isLoggedIn ? viewer.profile.id : null;

  // ----- 投稿（新規） ---------------------------------------------------------

  // 新規投稿用の Server Action を episodeId に bind しておく。viewer が
  // authenticated でないときは undefined（フォーム自体を出さない）
  const createBound = isLoggedIn
    ? createCommentAction.bind(null, episodeId)
    : null;

  /**
   * 投稿成功時のコールバック。新しい comment をリスト先頭に追加して楽観的に反映する。
   *
   * サーバーから返る `Comment` には user 情報が含まれないため、viewer.profile から
   * `CommentUser` を組み立てる。avatar_url は User 型では `string | null` だが
   * `CommentUser` では `string?`（undefined）。null は undefined に正規化する。
   *
   * **viewer.profile のスナップショット依存**: ここで使う `display_name` /
   * `avatar_url` は Server Component で `getViewer()` を呼んだ時点の値。投稿直後に
   * 別タブでプロフィールを変更してから再度投稿すると、その時点の楽観反映では古い
   * 表示名で残る（ページリロードで解消する）。**`viewer.profile.id === Comment.user_id`**
   * の対応関係は BE の Profile.ID と Comment.UserID の規約に依存する（PodLog では
   * Supabase UID を user_id として共有しているため一致する）。
   */
  function handleCreate(comment: Comment) {
    if (!isLoggedIn) return;
    const profile = viewer.profile;
    const newItem: EpisodeCommentItem = {
      id: comment.id,
      user: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url ?? undefined,
      },
      body: comment.body,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    };
    setComments((prev) => [newItem, ...prev]);
    setTotal((prev) => prev + 1);
  }

  // ----- 編集 -----------------------------------------------------------------

  /**
   * 編集成功時のコールバック。該当 comment の body / updated_at を差し替え、
   * 編集モードを抜ける。
   */
  function handleUpdate(comment: Comment) {
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? { ...c, body: comment.body, updated_at: comment.updated_at }
          : c,
      ),
    );
    setEditingId(null);
  }

  // ----- 削除（2 段階）-------------------------------------------------------

  /**
   * 削除確定時の処理。
   *
   * - **同時実行ガード**: 既に削除 API を投げ中 (`pendingDeleteId !== null`) の場合は
   *   早期 return。`MyCommentCard` 側でも `actionLoading` 中はボタンを disable して
   *   いるが、二重防御として親側でもガードする（複数カード間の race も塞ぐ）。
   * - **Server Action が throw する経路（ネットワーク断・シリアライズエラー等）**は
   *   `try/catch` で受けて `actionError` を表示する。`deleteCommentAction` 内部の
   *   catch を素通りした例外を UI に届ける役割。
   */
  async function handleConfirmDelete(commentId: string) {
    if (pendingDeleteId !== null) return;
    setPendingDeleteId(commentId);
    setActionError(null);
    try {
      const result = await deleteCommentAction(commentId);
      if (result.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setTotal((prev) => Math.max(0, prev - 1));
        setDeletingId(null);
      } else {
        setActionError(result.error ?? "感想の削除に失敗しました");
      }
    } catch (err) {
      setActionError(
        getUserFriendlyErrorMessage(err, "感想の削除に失敗しました"),
      );
    } finally {
      setPendingDeleteId(null);
    }
  }

  // ----- もっと見る -----------------------------------------------------------

  const hasMore = comments.length < total;

  /**
   * 「もっと見る」で次ページを取得する。
   *
   * - `offset = comments.length` で続きを取りに行く前提だが、楽観反映で先頭に
   *   追加した自分の感想と、サーバー側 `revalidate: 0` で返ってくる感想が同じ
   *   `id` で重複する可能性が理論上ある（複数タブ・複数ユーザーの並列投稿等）。
   *   id ベースで dedupe するガードを 1 段入れて防御する。
   * - `total` はサーバーの最新値で上書き（hasMore 判定を正確に保つ）。
   */
  function handleLoadMore() {
    startLoadMore(async () => {
      try {
        setActionError(null);
        const data = await fetchEpisodeComments(episodeId, {
          limit: COMMENT_PAGE_SIZE,
          offset: comments.length,
        });
        setComments((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const fresh = data.comments.filter((c) => !existingIds.has(c.id));
          return [...prev, ...fresh];
        });
        setTotal(data.total);
      } catch (err) {
        setActionError(
          getUserFriendlyErrorMessage(err, "追加読み込みに失敗しました"),
        );
      }
    });
  }

  // ---------------------------------------------------------------------------

  return (
    <section aria-labelledby="comment-section-heading">
      <div className="mb-4 flex items-center gap-3">
        <h2
          id="comment-section-heading"
          className="text-lg font-semibold text-stone-900"
        >
          感想
        </h2>
        {total > 0 && (
          <span className="text-sm text-stone-500">{total}件</span>
        )}
      </div>

      {/* 投稿フォーム / 未ログイン CTA */}
      <div className="mb-6">
        {createBound ? (
          <CommentForm action={createBound} onSuccess={handleCreate} />
        ) : (
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-center">
            <p className="text-sm text-stone-600">
              <Link
                href="/login"
                className="font-medium text-rose-600 hover:text-rose-700"
              >
                ログイン
              </Link>
              して感想を書きましょう
            </p>
          </div>
        )}
      </div>

      {/* リスト */}
      {comments.length === 0 ? (
        <p className="text-sm text-stone-500">まだ感想はありません</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const isMine = myId !== null && c.user.id === myId;

            // 編集モード中: 該当カードを CommentForm に置換
            if (isMine && editingId === c.id) {
              const updateBound = updateCommentAction.bind(null, c.id);
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-stone-700">
                      感想を編集
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-sm text-stone-500 hover:text-stone-700"
                    >
                      キャンセル
                    </button>
                  </div>
                  <CommentForm
                    action={updateBound}
                    initialBody={c.body}
                    submitLabel="更新"
                    onSuccess={handleUpdate}
                  />
                </div>
              );
            }

            // 自分の感想: 編集・削除メニュー付きカード
            if (isMine) {
              return (
                <MyCommentCard
                  key={c.id}
                  comment={c}
                  onEdit={() => {
                    setEditingId(c.id);
                    // 編集モードに入るとき削除確認は閉じる
                    if (deletingId === c.id) setDeletingId(null);
                  }}
                  onStartDelete={() => setDeletingId(c.id)}
                  confirmDelete={deletingId === c.id}
                  onConfirmDelete={() => handleConfirmDelete(c.id)}
                  onCancelDelete={() => setDeletingId(null)}
                  actionLoading={pendingDeleteId === c.id}
                />
              );
            }

            // 他人の感想: 閲覧専用カード
            return <CommentCard key={c.id} comment={c} />;
          })}
        </div>
      )}

      {actionError && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {actionError}
        </p>
      )}

      {hasMore && comments.length > 0 && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={isLoadMorePending}
          className="mt-4 w-full rounded-lg border border-stone-300 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {isLoadMorePending ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </section>
  );
}
