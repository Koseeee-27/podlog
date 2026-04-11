"use client";

import ErrorMessage from "@/components/ui/ErrorMessage";

interface RecordErrorProps {
  error: Error;
  reset: () => void;
}

export default function RecordError({ reset }: RecordErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-8">
      <ErrorMessage
        message="ページの読み込みに失敗しました。再試行してください。"
        onRetry={reset}
      />
    </div>
  );
}
