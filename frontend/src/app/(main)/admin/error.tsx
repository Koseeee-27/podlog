"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import ErrorMessage from "@/components/ui/ErrorMessage";

interface AdminErrorProps {
  error: Error;
  reset: () => void;
}

export default function AdminError({ reset }: AdminErrorProps) {
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
        message="ページの読み込みに失敗しました。再試行してください。"
        onRetry={handleRetry}
        isPending={isPending}
      />
    </div>
  );
}
