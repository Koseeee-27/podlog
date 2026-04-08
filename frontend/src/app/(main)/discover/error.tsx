"use client";

interface DiscoverErrorProps {
  error: Error;
  reset: () => void;
}

export default function DiscoverError({ reset }: DiscoverErrorProps) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
      <p className="text-sm text-red-700">
        ページの読み込みに失敗しました
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
      >
        再試行
      </button>
    </div>
  );
}
