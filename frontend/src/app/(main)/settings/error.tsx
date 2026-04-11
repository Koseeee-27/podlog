"use client";

import ErrorMessage from "@/components/ui/ErrorMessage";

interface SettingsErrorProps {
  error: Error;
  reset: () => void;
}

export default function SettingsError({ reset }: SettingsErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-8">
      <ErrorMessage
        message="ページの読み込みに失敗しました。再試行してください。"
        onRetry={reset}
      />
    </div>
  );
}
