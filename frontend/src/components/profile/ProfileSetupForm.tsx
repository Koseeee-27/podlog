"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createProfileAction, profileFormInitialState } from "@/lib/actions/profile";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ErrorMessage from "@/components/ui/ErrorMessage";

interface ProfileSetupFormProps {
  onComplete: () => Promise<void>;
}

export default function ProfileSetupForm({ onComplete }: ProfileSetupFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createProfileAction,
    profileFormInitialState,
  );

  useEffect(() => {
    if (state.success) {
      onComplete().then(() => router.push("/"));
    }
  }, [state.success, onComplete, router]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <ErrorMessage message={state.error} />}
      <Input
        id="username"
        name="username"
        label="ユーザー名"
        placeholder="your_username"
        required
        error={state.fieldErrors?.username}
      />
      <p className="text-xs text-stone-500 -mt-2">3〜30文字、英数字とアンダースコアのみ</p>
      <Input
        id="display-name"
        name="display_name"
        label="表示名"
        placeholder="あなたの名前"
        required
        error={state.fieldErrors?.display_name}
      />
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1">
          自己紹介（任意）
        </label>
        <textarea
          id="bio"
          name="bio"
          placeholder="好きなポッドキャストについて..."
          rows={3}
          className="block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        />
        {state.fieldErrors?.bio && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.bio}</p>
        )}
      </div>
      <Button type="submit" loading={isPending} className="w-full">
        プロフィールを作成
      </Button>
    </form>
  );
}
