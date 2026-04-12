"use client";

import { useState, useTransition, useRef } from "react";
import { updateMyProfile, updateMyFavoritePodcasts } from "@/lib/api/users";
import { displayNameSchema } from "@/lib/schemas/common";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useToast } from "@/components/ui/Toast";
import AvatarUpload from "@/components/profile/AvatarUpload";
import FavoritePodcastEditor from "@/components/profile/FavoritePodcastEditor";
import type { User, FavoritePodcastItem } from "@/types/user";
import { getUserFriendlyErrorMessage } from "@/lib/utils";

interface ProfileEditPageProps {
  profile: User;
  initialFavoritePodcasts: FavoritePodcastItem[];
  refreshProfile: () => Promise<void>;
  onSaveComplete: () => void;
  onCancel: () => void;
}

export default function ProfileEditPage({
  profile,
  initialFavoritePodcasts,
  refreshProfile,
  onSaveComplete,
  onCancel,
}: ProfileEditPageProps) {
  const { showToast } = useToast();

  // プロフィールデータの初期値を props から取得（setState-in-effect を回避）
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  // 好きな番組は Server Component で取得済み（props で受け取る）
  const [favoritePodcasts, setFavoritePodcasts] = useState<FavoritePodcastItem[]>(
    initialFavoritePodcasts,
  );
  // 保存時の差分判定用に初期値を保持（props は再レンダ間で安定しているため初期化時のみ参照）
  const initialFavoritePodcastsRef = useRef<FavoritePodcastItem[]>(initialFavoritePodcasts);

  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError("");

    const result = displayNameSchema.safeParse(displayName.trim());
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      try {
        // プロフィール更新（表示名・自己紹介）
        // bio は空文字を明示的に送信して、バックエンドで bio をクリアできるようにする
        await updateMyProfile({
          display_name: displayName.trim(),
          bio: bio.trim(),
        });

        // 好きな番組が変更されている場合のみ更新
        const currentIds = favoritePodcasts.map((p) => p.id).sort().join(",");
        const initialIds = initialFavoritePodcastsRef.current.map((p) => p.id).sort().join(",");
        if (currentIds !== initialIds) {
          await updateMyFavoritePodcasts(favoritePodcasts.map((p) => p.id));
        }

        // プロフィールを再取得してから遷移
        await refreshProfile();
        showToast("プロフィールを更新しました");
        onSaveComplete();
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err, "プロフィールの更新に失敗しました"));
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">プロフィール編集</h1>

      <Card padding="lg">
        <div className="space-y-6">
          {error && <ErrorMessage message={error} />}

          {/* アバター */}
          <AvatarUpload
            currentAvatarUrl={avatarUrl}
            displayName={displayName || profile.display_name}
            onUploadComplete={(newUrl) => setAvatarUrl(newUrl)}
            onError={(msg) => setError(msg)}
          />

          {/* 表示名 */}
          <Input
            id="display-name"
            label="表示名"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          {/* 自己紹介 */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1">
              自己紹介
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="自分のことを紹介してみましょう"
              className="block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>

          {/* 好きな番組 */}
          <FavoritePodcastEditor
            podcasts={favoritePodcasts}
            onChange={setFavoritePodcasts}
          />

          {/* アクションボタン */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              loading={isPending}
              onClick={handleSave}
            >
              保存する
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
            >
              キャンセル
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
