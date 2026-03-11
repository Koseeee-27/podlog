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

  const navLinks = [
    { href: "/search", label: "検索" },
  ];

  const profile = auth.status === "authenticated" ? auth.profile : null;

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-bold text-indigo-600">
                podlog
              </Link>
              <div className="hidden sm:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              {profile && (
                <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <Avatar src={profile.avatar_url} alt={profile.display_name} size="sm" />
                  <span className="text-sm font-medium text-gray-700">{profile.display_name}</span>
                </Link>
              )}
            </div>

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
        onSignOut={auth.signOut}
      />
    </>
  );
}
