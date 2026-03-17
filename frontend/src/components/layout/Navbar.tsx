"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/ui/Avatar";
import BottomNav from "./BottomNav";

export default function Navbar() {
  const router = useRouter();
  const auth = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const profile = auth.status === "authenticated" ? auth.profile : null;
  const isLoggedIn = auth.status === "authenticated" || auth.status === "no_profile";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <>
      {/* PC ヘッダー */}
      <nav className="hidden sm:block bg-white border-b border-stone-200 sticky top-0 z-40" aria-label="メインナビゲーション">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-4">
            {/* 左: ロゴ */}
            <Link href="/" className="text-lg font-bold text-rose-600 shrink-0">
              PodLog
            </Link>

            {/* 中央: 検索バー */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="番組を検索..."
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-rose-500 focus:bg-white focus:ring-1 focus:ring-rose-500 focus:outline-none transition-colors"
                />
              </div>
            </form>

            {/* 右: アクションボタン */}
            <div className="flex items-center gap-2 shrink-0">
              {profile ? (
                <>
                  {/* ＋ 記録する（暫定: /search へ） */}
                  <Link
                    href="/search"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    記録する
                  </Link>

                  {/* アバタードロップダウン */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center hover:opacity-80 transition-opacity"
                      aria-expanded={dropdownOpen}
                      aria-haspopup="true"
                    >
                      <Avatar src={profile.avatar_url} alt={profile.display_name} size="sm" />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-stone-200 bg-white shadow-lg py-2 z-50">
                        <div className="px-4 py-2 border-b border-stone-100">
                          <p className="text-sm font-medium text-stone-900">{profile.display_name}</p>
                          <p className="text-xs text-stone-500">@{profile.username}</p>
                        </div>
                        <Link
                          href={`/users/${profile.username}`}
                          className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          マイページ
                        </Link>
                        <Link
                          href="/settings"
                          className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          設定
                        </Link>
                        <div className="border-t border-stone-100 mt-1 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDropdownOpen(false);
                              auth.signOut();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                          >
                            ログアウト
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : auth.status === "no_profile" ? (
                <Link
                  href="/profile/setup"
                  className="px-4 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors"
                >
                  プロフィール設定
                </Link>
              ) : !isLoggedIn && auth.status !== "loading" ? (
                <Link
                  href="/login"
                  className="px-4 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors"
                >
                  ログイン
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      {/* SP ボトムナビ */}
      <BottomNav profile={profile} isLoggedIn={isLoggedIn} isLoading={auth.status === "loading"} />
    </>
  );
}
