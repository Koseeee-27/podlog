import { PencilSquareIcon } from "@heroicons/react/24/outline";

export interface ReviewPromptProps {
  onClickReview: () => void;
}

export default function ReviewPrompt({ onClickReview }: ReviewPromptProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-rose-50 px-4 py-3">
      <p className="text-sm text-stone-700">
        レビューも書いてみませんか？
      </p>
      <button
        type="button"
        onClick={onClickReview}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-100"
      >
        <PencilSquareIcon className="h-4 w-4" />
        レビューを書く
      </button>
    </div>
  );
}
