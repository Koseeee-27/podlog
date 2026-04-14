"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

/**
 * ナビゲーション上部の番組検索フォーム (PC 用)。
 *
 * Navbar 本体を Server Component に保つため、useState + useRouter を使う
 * 検索フォーム部分だけをこの Client Component に切り出している。
 */
export default function NavbarSearchForm() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
  }

  return (
    <form onSubmit={handleSearch} className="flex-1 max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="番組を検索..."
          aria-label="番組を検索"
          className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-rose-500 focus:bg-white focus:ring-1 focus:ring-rose-500 focus:outline-none transition-colors"
        />
      </div>
    </form>
  );
}
