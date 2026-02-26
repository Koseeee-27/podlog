"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Loading from "@/components/ui/Loading";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function SettingsClient() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.push("/login");
    }
  }, [auth.status, router]);

  if (auth.status === "loading" || auth.status === "unauthenticated") {
    return <Loading />;
  }

  const profile = auth.status === "authenticated" ? auth.profile : null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="space-y-4">
        {profile && (
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">アカウント情報</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-500 w-24">ユーザー名</dt>
                <dd className="text-gray-900">@{profile.username}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 w-24">表示名</dt>
                <dd className="text-gray-900">{profile.display_name}</dd>
              </div>
            </dl>
          </Card>
        )}

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ログアウト</h2>
          <p className="text-sm text-gray-600 mb-4">
            ログアウトすると、再度ログインが必要になります。
          </p>
          <Button
            variant="danger"
            onClick={async () => {
              await auth.signOut();
              router.push("/login");
            }}
          >
            ログアウト
          </Button>
        </Card>
      </div>
    </div>
  );
}
