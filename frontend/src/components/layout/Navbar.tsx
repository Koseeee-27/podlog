"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/ui/Avatar";
import BottomNav from "./BottomNav";

export default function Navbar() {
  const pathname = usePathname();
  const auth = useAuth();

  const profile = auth.status === "authenticated" ? auth.profile : null;
  const isLoggedIn = auth.status === "authenticated" || auth.status === "no_profile";

  return (
    <>
      {/* PC ヘッダー */}
      <nav className="hidden sm:block bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* 左側: ロゴ */}
            <Link href="/" className="text-lg font-bold text-rose-600">
              PodLog
            </Link>

            {/* 中央: 検索リンク */}
            <div className="flex items-center gap-1">
              <Link
                href="/search"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === "/search"
                    ? "bg-rose-50 text-rose-700"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                }`}
              >
                検索
              </Link>
            </div>

            {/* 右側: ユーザー情報 */}
            <div className="flex items-center gap-3">
              {profile ? (
                <Link
                  href={`/users/${profile.username}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Avatar src={profile.avatar_url} alt={profile.display_name} size="sm" />
                  <span className="text-sm font-medium text-stone-700">{profile.display_name}</span>
                </Link>
              ) : auth.status === "no_profile" ? (
                <Link
                  href="/profile/setup"
                  className="px-4 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-md hover:bg-rose-600 transition-colors"
                >
                  プロフィール設定
                </Link>
              ) : !isLoggedIn && auth.status !== "loading" ? (
                <Link
                  href="/login"
                  className="px-4 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-md hover:bg-rose-600 transition-colors"
                >
                  ログイン
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      {/* SP ボトムナビ */}
      <BottomNav profile={profile} isLoggedIn={isLoggedIn} />
    </>
  );
}
