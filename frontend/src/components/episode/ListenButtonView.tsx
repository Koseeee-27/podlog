export interface ListenButtonViewProps {
  listened: boolean;
  loading: boolean;
  toggling: boolean;
  error?: string | null;
  onToggle: () => void;
}

export default function ListenButtonView({
  listened,
  loading,
  toggling,
  error,
  onToggle,
}: ListenButtonViewProps) {
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
