"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import PodcastRequestDialog from "@/components/discover/PodcastRequestDialog";
import LoginPromptButton from "@/components/ui/LoginPromptButton";
import { PlusCircleIcon } from "@heroicons/react/24/outline";

export default function PodcastRequestPrompt() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const auth = useAuth();

  return (
    <>
      <div className="mt-6 border border-stone-200 rounded-xl p-5 text-center">
        <p className="text-sm font-medium text-stone-700">
          お探しの番組が見つかりませんか？
        </p>
        <p className="mt-1 text-xs text-stone-500">
          番組の追加をリクエストできます
        </p>
        <div className="mt-4">
          {auth.status === "authenticated" ||
          auth.status === "no_profile" ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
            >
              <PlusCircleIcon className="h-5 w-5" />
              番組追加をリクエストする
            </button>
          ) : (
            <LoginPromptButton label="ログインしてリクエストする" />
          )}
        </div>
      </div>

      <PodcastRequestDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
