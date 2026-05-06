"use client";

/**
 * X 風の短文感想投稿フォーム。
 *
 * 設計のポイント:
 * - **短文を促すデフォルト**: 初期 3 行 / プレースホルダー「いまの感想をひとことで」
 * - **柔軟な拡張**: textarea が auto-grow（最大 240px 程度まで）
 * - **文字数表示**: 0〜140 グレー / 141〜1000 通常 / 1001+ 赤
 * - **送信抑止**: trim 後 0 文字（空白のみ含む）/ 1001 字超 / `isPending` 中は disabled
 * - **連投 UX**: 投稿成功時 (`state.success === true`) に textarea をクリアし、
 *   フォーカスを保持して即座に次の感想を書ける
 * - フォーム送信は `useActionState` + Server Action（`frontend.md` 規約）
 *
 * 編集モードの想定:
 * - `initialBody` を渡すと textarea の初期値になる（非空 = 編集モード判定）
 * - `submitLabel` を「更新」等に変えて使う
 * - **編集モードでは投稿成功時の textarea クリアをスキップする**: 親
 *   (`MyCommentCard`) 側が `onSuccess` を受けてフォーム自体を unmount し
 *   表示モードに戻す想定。クリア処理を走らせると unmount 直前の 1 フレームで
 *   空 textarea が見える可能性があるため、明示的に分岐している
 */

import { useActionState, useId, useLayoutEffect, useRef, useState } from "react";
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
  // trim 後の長さ。送信ボタンの disabled 判定に使う（カウンタ表示は raw `length`）。
  // 空白のみ（"   "）入力時にボタンが押せて Server Action 側でエラーになるのを
  // 避けるため、disabled は trimmedLength 基準で判定する。
  const [trimmedLength, setTrimmedLength] = useState(initialBody.trim().length);

  // 同一ページ内で複数の CommentForm が同時に描画されるケース（Storybook Docs /
  // 将来の複数編集フォーム等）で id が衝突しないよう、`useId()` で
  // インスタンスごとにユニークな接頭辞を生成する。`<label htmlFor>` と
  // `<textarea id>` / `aria-describedby` の関連付けを壊さないために必須。
  const idPrefix = useId();
  const bodyId = `${idPrefix}-body`;
  const counterId = `${idPrefix}-counter`;
  const errorId = `${idPrefix}-error`;
  const limitWarningId = `${idPrefix}-limit-warning`;

  // 編集モード判定: initialBody が非空 = 編集中。textarea クリアは新規投稿
  // モードのみで実行する（編集モードでは親が onSuccess で UI を表示モードに
  // 戻すため、空 textarea が一瞬見える可能性を避ける）
  const isEditMode = initialBody.length > 0;

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
   *
   * **編集モードでは textarea クリアをスキップ**: 編集モードでは親が `onSuccess`
   * で表示モードに戻すため、フォーム自体がアンマウントされる想定。クリア処理を
   * 走らせると、unmount 直前の 1 フレームで空 textarea が見える可能性がある。
   */
  async function wrappedAction(
    prev: CommentFormState,
    fd: FormData,
  ): Promise<CommentFormState> {
    const result = await action(prev, fd);
    if (result.success && result.comment) {
      if (!isEditMode) {
        formRef.current?.reset();
        if (textareaRef.current) {
          // reset 後の auto-grow 高さを初期化
          textareaRef.current.style.height = "auto";
          textareaRef.current.focus();
        }
        // form.reset() は textarea の onInput を発火させないため、
        // length / trimmedLength state を明示的に同期する
        setLength(0);
        setTrimmedLength(0);
      }
      onSuccess?.(result.comment);
    }
    return result;
  }

  const [state, formAction, isPending] = useActionState<
    CommentFormState,
    FormData
  >(wrappedAction, { success: false });

  // 初回マウント時の auto-grow 初期化（編集モードで initialBody が長い場合の対応）。
  // `handleInput` はユーザー入力時にしか走らないため、`defaultValue` で長文が
  // 入っていると textarea が `minHeight: 5rem`（≈ 3 行）固定になりスクロールが
  // 必要になる。`useLayoutEffect` で paint 前に高さを確定させるとチラつきがない。
  // setState は呼ばないため React 19 の `set-state-in-effect` ルールには抵触しない。
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (ta && ta.value) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, AUTOGROW_MAX_PX)}px`;
    }
  }, []);

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    setLength(ta.value.length);
    setTrimmedLength(ta.value.trim().length);
    // auto-grow: 一度 auto に戻して scrollHeight を測り、上限内で再設定
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, AUTOGROW_MAX_PX)}px`;
  }

  // 文字数カウンタの色 / 上限判定はすべて trim 後の長さ基準に統一する。
  // Server Action 側のバリデーション (`commentBodySchema = .trim().max(1000)`)
  // と整合させ、末尾スペース等で raw が 1001+ でも trim 後 1000 以内なら
  // 投稿可能、というケースで UI 側が不要に弾かないようにする。
  let counterClass: string;
  if (trimmedLength <= SOFT_LIMIT) {
    counterClass = "text-stone-400";
  } else if (trimmedLength <= HARD_LIMIT) {
    counterClass = "text-stone-600";
  } else {
    counterClass = "text-red-600 font-medium";
  }

  const isOverHardLimit = trimmedLength > HARD_LIMIT;
  // disabled 判定は trim 後の長さ基準。空白のみ（"   "）でボタンが押せるのを
  // 避ける（Server Action 側の `commentBodySchema.min(1)` でエラーになるため）。
  const disabled = isPending || isOverHardLimit || trimmedLength === 0;

  // textarea の `aria-describedby` を動的に組み立てる。
  // - 常時: カウンタ
  // - 条件付き: 上限超過警告 / Server エラー文言
  // スクリーンリーダーが textarea にフォーカスしたとき、なぜ無効なのかを
  // 「カウンタ + 警告 + エラー」の順で読み上げられるようにする。
  const describedByIds = [
    counterId,
    isOverHardLimit ? limitWarningId : null,
    state.error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <label htmlFor={bodyId} className="sr-only">
          感想
        </label>
        <textarea
          ref={textareaRef}
          id={bodyId}
          name="body"
          defaultValue={initialBody}
          onInput={handleInput}
          rows={3}
          placeholder={placeholder}
          disabled={isPending}
          // maxLength は意図的に設定しない:
          // ハードカットすると「1001 字超過時の視覚フィードバック」が機能しなくなるため、
          // ペースト等で超過した場合は赤字 + 投稿ボタン無効化で抑止する設計
          aria-invalid={isOverHardLimit || Boolean(state.error)}
          aria-describedby={describedByIds}
          className="w-full resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm placeholder:text-stone-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 disabled:bg-stone-50"
          style={{ minHeight: "5rem", maxHeight: `${AUTOGROW_MAX_PX}px` }}
        />
        <div className="mt-1 flex items-center justify-between">
          <span id={counterId} className={`text-xs ${counterClass}`}>
            {length}/{HARD_LIMIT}
          </span>
          {isOverHardLimit && (
            // role="alert" でライブリージョン化し、超過した瞬間に
            // スクリーンリーダーが読み上げる。aria-describedby 経由でも参照される
            <span
              id={limitWarningId}
              role="alert"
              className="text-xs text-red-600"
            >
              {HARD_LIMIT}文字以内で入力してください
            </span>
          )}
        </div>
      </div>

      {state.error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
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
