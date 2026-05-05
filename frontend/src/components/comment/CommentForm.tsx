"use client";

/**
 * X 風の短文感想投稿フォーム。
 *
 * 設計のポイント:
 * - **短文を促すデフォルト**: 初期 3 行 / プレースホルダー「いまの感想をひとことで」
 * - **柔軟な拡張**: textarea が auto-grow（最大 240px 程度まで）
 * - **文字数表示**: 0〜140 グレー / 141〜1000 通常 / 1001+ 赤
 * - **送信抑止**: 0 文字 / 1001 字超 / `isPending` 中は disabled
 * - **連投 UX**: 投稿成功時 (`state.success === true`) に textarea をクリアし、
 *   フォーカスを保持して即座に次の感想を書ける
 * - フォーム送信は `useActionState` + Server Action（`frontend.md` 規約）
 *
 * 編集モードの想定:
 * - `initialBody` を渡すと textarea の初期値になる
 * - `submitLabel` を「更新」等に変えて使う
 * - 投稿成功時の textarea クリアは編集モードでも実行されるが、親 (`MyCommentCard`)
 *   側が `onSuccess` を受けて UI を表示モードに戻すため、クリアされた textarea が
 *   見えることはない
 */

import { useActionState, useRef, useState } from "react";
import type { CommentFormState } from "@/lib/actions/comment";
import type { Comment } from "@/types/comment";

/** 推奨文字数（X 的な短文の目安）。これ以下はカウンターをグレーで表示する */
const SOFT_LIMIT = 140;
/** 投稿可能な最大文字数（BE の `comments_body_length_check` と整合） */
const HARD_LIMIT = 1000;
/** auto-grow の最大ピクセル高さ（およそ 8〜10 行分） */
const AUTOGROW_MAX_PX = 240;

interface CommentFormProps {
  /**
   * Server Action（`useActionState` 互換）。`createCommentAction(episodeId, ...)`
   * 等の bind 済み Action を渡す想定。
   */
  action: (
    prevState: CommentFormState,
    formData: FormData,
  ) => Promise<CommentFormState>;
  /** 編集時の初期本文。新規投稿では未指定（空文字扱い）。 */
  initialBody?: string;
  /** 投稿ボタンのラベル（編集時は「更新」等に上書き） */
  submitLabel?: string;
  /** textarea のプレースホルダー */
  placeholder?: string;
  /**
   * 投稿成功時のコールバック。
   * - 新規投稿: 親が一覧再取得 / 楽観的反映を行うために使う
   * - 編集: 親が UI を表示モードに戻すために使う
   */
  onSuccess?: (comment: Comment) => void;
}

export default function CommentForm({
  action,
  initialBody = "",
  submitLabel = "投稿",
  placeholder = "いまの感想をひとことで",
  onSuccess,
}: CommentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [length, setLength] = useState(initialBody.length);

  /**
   * useActionState の Action を wrap して、投稿成功時の textarea クリア + フォーカス
   * 保持 + onSuccess コールバック呼び出しを行う。
   *
   * **効果を effect 内で setState する形にしない理由**: React 19 の
   * `react-hooks/set-state-in-effect` ルールで `useEffect` 内の `setState` は
   * cascading render を招くため避けるべきとされている。Action の戻り値判定 →
   * DOM 操作 + setState は同期的にまとめてここで実行する。`wrappedAction` 自体は
   * クライアント側で実行されるラッパー（"use server" は内側の `action` のみ）
   * なので、DOM 操作と setState を直接書ける。
   */
  async function wrappedAction(
    prev: CommentFormState,
    fd: FormData,
  ): Promise<CommentFormState> {
    const result = await action(prev, fd);
    if (result.success && result.comment) {
      formRef.current?.reset();
      if (textareaRef.current) {
        // reset 後の auto-grow 高さを初期化
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
      // form.reset() は textarea の onInput を発火させないため、
      // length state を明示的に同期する
      setLength(0);
      onSuccess?.(result.comment);
    }
    return result;
  }

  const [state, formAction, isPending] = useActionState<
    CommentFormState,
    FormData
  >(wrappedAction, { success: false });

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    setLength(ta.value.length);
    // auto-grow: 一度 auto に戻して scrollHeight を測り、上限内で再設定
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, AUTOGROW_MAX_PX)}px`;
  }

  // 文字数カウンタの色
  let counterClass: string;
  if (length <= SOFT_LIMIT) {
    counterClass = "text-stone-400";
  } else if (length <= HARD_LIMIT) {
    counterClass = "text-stone-600";
  } else {
    counterClass = "text-red-600 font-medium";
  }

  const isOverHardLimit = length > HARD_LIMIT;
  const disabled = isPending || isOverHardLimit || length === 0;

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <label htmlFor="comment-body" className="sr-only">
          感想
        </label>
        <textarea
          ref={textareaRef}
          id="comment-body"
          name="body"
          defaultValue={initialBody}
          onInput={handleInput}
          rows={3}
          placeholder={placeholder}
          disabled={isPending}
          // maxLength は意図的に設定しない:
          // ハードカットすると「1001 字超過時の視覚フィードバック」が機能しなくなるため、
          // ペースト等で超過した場合は赤字 + 投稿ボタン無効化で抑止する設計
          aria-invalid={isOverHardLimit}
          aria-describedby="comment-counter"
          className="w-full resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 disabled:bg-stone-50"
          style={{ minHeight: "5rem", maxHeight: `${AUTOGROW_MAX_PX}px` }}
        />
        <div className="mt-1 flex items-center justify-between">
          <span id="comment-counter" className={`text-xs ${counterClass}`}>
            {length}/{HARD_LIMIT}
          </span>
          {isOverHardLimit && (
            <span className="text-xs text-red-600">
              {HARD_LIMIT}文字以内で入力してください
            </span>
          )}
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={disabled}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
            disabled
              ? "bg-stone-300 cursor-not-allowed"
              : "bg-rose-500 hover:bg-rose-600"
          }`}
        >
          {isPending ? "送信中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
