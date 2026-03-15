"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createProfile } from "@/lib/api/users";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ErrorMessage from "@/components/ui/ErrorMessage";

interface ProfileSetupFormProps {
  onComplete: () => void;
}

export default function ProfileSetupForm({ onComplete }: ProfileSetupFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setError("ユーザー名は3〜30文字の英数字とアンダースコアのみ使用できます");
      return;
    }

    setLoading(true);

    try {
      await createProfile({
        username,
        display_name: displayName,
        bio: bio || undefined,
      });
      onComplete();
      router.push("/");
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("プロフィールの作成に失敗しました");
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} />}
      <Input
        id="username"
        label="ユーザー名"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="your_username"
        required
      />
      <p className="text-xs text-stone-500 -mt-2">3〜30文字、英数字とアンダースコアのみ</p>
      <Input
        id="display-name"
        label="表示名"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="あなたの名前"
        required
      />
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1">
          自己紹介（任意）
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="好きなポッドキャストについて..."
          rows={3}
          className="block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        />
      </div>
      <Button type="submit" loading={loading} className="w-full">
        プロフィールを作成
      </Button>
    </form>
  );
}
