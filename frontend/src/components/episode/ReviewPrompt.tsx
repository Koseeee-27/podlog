import { PencilSquareIcon } from "@heroicons/react/24/outline";

/**
 * 「聴いた」記録後に評価を誘導するバナー。
 * アンカーリンクで評価セクションまでスクロールする。
 *
 * 評価/感想分離（podlog-workspace#59）の P-6 でアンカー先を
 * `#review-section` → `#rating-section` に追従し、文言も
 * 「レビュー」→「評価」に変更した。
 *
 * P-8（感想セクション追加）後は感想誘導 1 本に統一する方針のため、
 * 本コンポーネントは P-8 で書き換え予定（ファイル名 `ReviewPrompt`
 * のリネームは P-9 の旧 review 系一掃で対応）。
 */
export default function ReviewPrompt() {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-rose-50 px-4 py-3">
      <p className="text-sm text-stone-700">
        評価してみませんか？
      </p>
      <a
        href="#rating-section"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-100"
      >
        <PencilSquareIcon className="h-4 w-4" />
        評価する
      </a>
    </div>
  );
}
