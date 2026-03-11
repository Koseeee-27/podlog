"use client";

import Link from "next/link";
import { useEffect } from "react";
import Avatar from "@/components/ui/Avatar";
import type { User } from "@/types/user";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  profile: User | null;
  onSignOut: () => void;
}

export default function MobileNav({ open, onClose, profile, onSignOut }: MobileNavProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <span className="font-bold text-indigo-600">podlog</span>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700" aria-label="メニューを閉じる">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {profile && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Avatar src={profile.avatar_url} alt={profile.display_name} size="md" />
              <div>
                <p className="font-medium text-gray-900">{profile.display_name}</p>
                <p className="text-sm text-gray-500">@{profile.username}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="p-4 space-y-1">
          <NavLink href="/search" onClick={onClose}>検索</NavLink>
          <NavLink href="/profile" onClick={onClose}>プロフィール</NavLink>
          <NavLink href="/settings" onClick={onClose}>設定</NavLink>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}

function NavLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
    >
      {children}
    </Link>
  );
}
