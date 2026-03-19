"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { ChevronRightIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import type { User } from "@/types/user";

interface SettingsClientProps {
  initialProfile: User | null;
}

export default function SettingsClient({ initialProfile }: SettingsClientProps) {
  const auth = useAuth();

  // クライアント側の認証状態がロード済みならそちらを優先、そうでなければサーバーから渡されたデータを使用
  const profile =
    auth.status === "authenticated" ? auth.profile : initialProfile;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">設定</h1>

      <div className="space-y-4">
        {profile && (
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-stone-900 mb-2">アカウント情報</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-stone-500 w-24">ユーザー名</dt>
                <dd className="text-stone-900">@{profile.username}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-stone-500 w-24">表示名</dt>
                <dd className="text-stone-900">{profile.display_name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-stone-500 w-24">ログイン方法</dt>
                <dd className="text-stone-900">Google</dd>
              </div>
            </dl>
          </Card>
        )}

        <Link href="/settings/profile" className="block">
          <Card padding="lg" className="flex items-center justify-between hover:bg-stone-50 transition-colors cursor-pointer">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">プロフィールを編集する</h2>
              <p className="text-sm text-stone-500 mt-1">
                表示名・アバター・自己紹介・好きな番組の編集
              </p>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-stone-400" />
          </Card>
        </Link>

        {profile?.is_admin && (
          <Link href="/admin" className="block">
            <Card padding="lg" className="flex items-center justify-between hover:bg-rose-50 transition-colors cursor-pointer border-rose-100">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="w-5 h-5 text-rose-500" />
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">管理画面</h2>
                  <p className="text-sm text-stone-500 mt-1">
                    番組の手動登録・管理用の機能
                  </p>
                </div>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-stone-400" />
            </Card>
          </Link>
        )}

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">ログアウト</h2>
          <p className="text-sm text-stone-600 mb-4">
            ログアウトすると、再度ログインが必要になります。
          </p>
          <Button
            variant="danger"
            onClick={async () => {
              await auth.signOut();
              window.location.href = "/login";
            }}
          >
            ログアウト
          </Button>
        </Card>

        <div className="flex gap-4 justify-center text-sm text-stone-400 pt-2">
          <Link href="/terms" className="hover:text-stone-600 transition-colors">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:text-stone-600 transition-colors">
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </div>
  );
}
