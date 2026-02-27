"use client";

import { useState, FormEvent } from "react";
import { updateMyProfile } from "@/lib/api/users";
import { isValidUrl } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ErrorMessage from "@/components/ui/ErrorMessage";
import type { User, UpdateProfileRequest } from "@/types/user";

interface ProfileEditFormProps {
  user: User;
  onSave: () => void;
  onCancel: () => void;
}

export default function ProfileEditForm({ user, onSave, onCancel }: ProfileEditFormProps) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [bio, setBio] = useState(user.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (avatarUrl && !isValidUrl(avatarUrl)) {
      setError("アバターURLはhttp://またはhttps://で始まる有効なURLを入力してください");
      setLoading(false);
      return;
    }

    const data: UpdateProfileRequest = {};
    if (displayName !== user.display_name) data.display_name = displayName;
    if (bio !== (user.bio || "")) data.bio = bio;
    if (avatarUrl !== (user.avatar_url || "")) data.avatar_url = avatarUrl;

    try {
      await updateMyProfile(data);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorMessage message={error} />}
      <Input
        id="display-name"
        label="表示名"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
      />
      <Input
        id="avatar-url"
        label="アバター URL（任意）"
        type="url"
        value={avatarUrl}
        onChange={(e) => setAvatarUrl(e.target.value)}
        placeholder="https://example.com/avatar.png"
      />
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          自己紹介（任意）
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div className="flex gap-3">
        <Button type="submit" loading={loading}>
          保存
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
