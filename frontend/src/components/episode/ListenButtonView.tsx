export interface ListenButtonViewProps {
  listened: boolean;
  loading: boolean;
  toggling: boolean;
  error?: string | null;
  onToggle: () => void;
  /** true の場合、テキストなしのアイコンのみ小さいボタンを表示する */
  compact?: boolean;
}

export default function ListenButtonView({
  listened,
  loading,
  toggling,
  error,
  onToggle,
  compact = false,
}: ListenButtonViewProps) {
  if (compact) {
    if (loading) {
      return (
        <button
          disabled
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-stone-200 text-stone-300"
          aria-label="読み込み中"
        >
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </button>
      );
    }

    return (
      <button
        onClick={onToggle}
        disabled={toggling}
        aria-pressed={listened}
        aria-label={listened ? "聴取記録を削除" : "聴いたを記録"}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
          listened
            ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
            : "border border-stone-300 text-stone-400 hover:bg-stone-50 hover:text-stone-600"
        } ${toggling ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {listened ? (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    );
  }

  if (loading) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-400"
      >
        読み込み中...
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        disabled={toggling}
        aria-pressed={listened}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          listened
            ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
            : "border border-stone-300 text-stone-700 hover:bg-stone-50"
        } ${toggling ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {listened ? (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        聴いた
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
