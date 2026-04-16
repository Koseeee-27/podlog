"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import AdminBadge from "@/components/ui/AdminBadge";
import { signOut } from "@/lib/auth/signOut";
import type { User } from "@/types/user";

interface NavbarUserMenuProps {
  profile: User;
}

/**
 * PC ヘッダー右上のユーザードロップダウンメニュー。
 *
 * Navbar 本体を Server Component に保つため、useState (開閉状態) /
 * useRef / useEffect (外側クリックで閉じる) を使う部分だけをこの
 * Client Component に切り出している。
 */
export default function NavbarUserMenu({ profile }: NavbarUserMenuProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        className="flex items-center hover:opacity-80 transition-opacity"
        aria-label="ユーザーメニュー"
        aria-expanded={dropdownOpen}
      >
        <Avatar src={profile.avatar_url} alt={profile.display_name} size="sm" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-stone-200 bg-white shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b border-stone-100">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-stone-900">
                {profile.display_name}
              </p>
              {profile.is_admin && <AdminBadge />}
            </div>
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
          {profile.is_admin && (
            <Link
              href="/admin"
              className="block px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              onClick={() => setDropdownOpen(false)}
            >
              管理
            </Link>
          )}
          <div className="border-t border-stone-100 mt-1 pt-1">
            <button
              type="button"
              onClick={async () => {
                setDropdownOpen(false);
                await signOut(router);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
