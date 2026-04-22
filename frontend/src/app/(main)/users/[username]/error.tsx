"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import ErrorMessage from "@/components/ui/ErrorMessage";

interface UserProfileErrorProps {
  error: Error;
  reset: () => void;
}

export default function UserProfileError({ error, reset }: UserProfileErrorProps) {
  // Server 側で発生したエラーは instrumentation.ts の onRequestError が
  // 自動で Sentry に送信するため、このファイルでは再送信しない。
  console.error("[UserProfileError]", error);

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="flex items-center justify-center min-h-[200px] p-8">
      <ErrorMessage
        message="プロフィールの読み込みに失敗しました。再試行してください。"
        onRetry={handleRetry}
        isPending={isPending}
      />
    </div>
  );
}
