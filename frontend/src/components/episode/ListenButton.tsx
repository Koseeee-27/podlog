"use client";

import { useListeningStatus } from "@/hooks/useListeningRecord";

interface ListenButtonProps {
  episodeId: string;
}

export default function ListenButton({ episodeId }: ListenButtonProps) {
  const { listened, loading, toggling, error, toggle } = useListeningStatus(episodeId);

  if (loading) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-400"
      >
        読み込み中...
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={toggle}
        disabled={toggling}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          listened
            ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
        } ${toggling ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {listened ? (
          <>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            聴いた
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            聴いたにする
          </>
        )}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
