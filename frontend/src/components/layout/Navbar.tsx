"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/ui/Avatar";
import MobileNav from "./MobileNav";

export default function Navbar() {
  const pathname = usePathname();
  const auth = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const profile = auth.status === "authenticated" ? auth.profile : null;
  const isLoggedIn = auth.status === "authenticated" || auth.status === "no_profile";

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* 左側: ロゴ + 検索リンク */}
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-bold text-indigo-600">
                PodLog
              </Link>
              <div className="hidden sm:flex items-center gap-1">
                <Link
                  href="/search"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/search"
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  検索
                </Link>
              </div>
            </div>

            {/* 右側: デスクトップ表示 */}
            <div className="hidden sm:flex items-center gap-3">
              {profile ? (
                <Link
                  href={`/users/${profile.username}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Avatar src={profile.avatar_url} alt={profile.display_name} size="sm" />
                  <span className="text-sm font-medium text-gray-700">{profile.display_name}</span>
                </Link>
              ) : auth.status === "no_profile" ? (
                <Link
                  href="/profile/setup"
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                >
                  プロフィール設定
                </Link>
              ) : !isLoggedIn && auth.status !== "loading" ? (
                <Link
                  href="/login"
                  className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                >
                  ログイン
                </Link>
              ) : null}
            </div>

            {/* ハンバーガーメニュー: モバイル */}
            <button
              className="sm:hidden p-2 text-gray-600 hover:text-gray-900"
              onClick={() => setMobileOpen(true)}
              aria-label="メニューを開く"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        profile={profile}
        isLoggedIn={isLoggedIn}
        isLoading={auth.status === "loading"}
        onSignOut={auth.signOut}
      />
    </>
  );
}
