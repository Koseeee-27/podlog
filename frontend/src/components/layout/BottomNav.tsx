"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Viewer } from "@/lib/auth/getViewer";

interface BottomNavProps {
  viewer: Viewer;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  isPrimary?: boolean;
  isActive: (pathname: string) => boolean;
}

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const SearchIcon = ({ active }: { active: boolean }) => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const UserIcon = ({ active }: { active: boolean }) => (
  <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

/**
 * 右端タブ (ユーザータブ) のラベルと遷移先を `viewer` の状態から決定する。
 *
 * - `guest`         → ログイン画面への導線
 * - `no_profile`    → プロフィール設定画面への導線 (初回ログイン直後)
 * - `authenticated` → 自分のマイページ
 *
 * `Navbar` (PC ヘッダー) の右側アクションと同じ判別 union を使い、認証状態の
 * 表現を `viewer: Viewer` に統一している (PR #332 の続き)。
 */
function getLastTab(viewer: Viewer): { label: string; href: string } {
  if (viewer.status === "guest") return { label: "ログイン", href: "/login" };
  if (viewer.status === "no_profile") return { label: "プロフィール設定", href: "/profile/setup" };
  return { label: "マイページ", href: `/users/${viewer.profile.username}` };
}

export default function BottomNav({ viewer }: BottomNavProps) {
  const pathname = usePathname();
  const lastTab = getLastTab(viewer);

  const navItems: NavItem[] = [
    {
      id: "home",
      label: "ホーム",
      href: "/",
      icon: <HomeIcon active={pathname === "/"} />,
      isActive: (p) => p === "/",
    },
    {
      id: "discover",
      label: "探す",
      href: "/discover",
      icon: <SearchIcon active={pathname === "/discover"} />,
      isActive: (p) => p === "/discover",
    },
    {
      id: "record",
      label: "記録する",
      href: "/record",
      icon: <PlusIcon />,
      isPrimary: true,
      isActive: (p) => p === "/record",
    },
    {
      id: "user",
      label: lastTab.label,
      href: lastTab.href,
      icon: <UserIcon active={pathname === lastTab.href} />,
      isActive: (p) => p === lastTab.href,
    },
  ];

  return (
    <nav aria-label="ボトムナビゲーション" className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const active = item.isActive(pathname);
          const className = `flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
            active ? "text-rose-500" : "text-stone-400"
          }`;

          return (
            <Link key={item.id} href={item.href} className={className} aria-current={active ? "page" : undefined}>
              {item.isPrimary ? (
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 text-white">
                  {item.icon}
                </span>
              ) : (
                item.icon
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
