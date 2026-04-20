import Image from "next/image";
import Link from "next/link";
import NavbarSearchForm from "./NavbarSearchForm";
import NavbarUserMenu from "./NavbarUserMenu";
import BottomNav from "./BottomNav";
import type { Viewer } from "@/lib/auth/getViewer";

interface NavbarProps {
  viewer: Viewer;
}

/**
 * アプリ全体のナビゲーションバー (PC ヘッダー + SP ボトムナビ)。
 *
 * Server Component として認証情報 (`viewer`) を props で受け取り、
 * ロゴ / 記録ボタン / ログインボタンのような静的部分は SC のまま描画する。
 * インタラクションが必要な検索フォームとユーザードロップダウンは
 * `NavbarSearchForm` / `NavbarUserMenu` に切り出している。
 */
export default function Navbar({ viewer }: NavbarProps) {
  const profile = viewer.status === "authenticated" ? viewer.profile : null;

  return (
    <>
      {/* PC ヘッダー */}
      <nav
        className="hidden sm:block bg-white border-b border-stone-200 sticky top-0 z-40"
        aria-label="メインナビゲーション"
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-4">
            {/* 左: ロゴ */}
            <Link href="/" className="shrink-0">
              <Image
                src="/logo-horizontal.png"
                alt="PodLog"
                width={120}
                height={28}
                priority
              />
            </Link>

            {/* 中央: 検索バー */}
            <NavbarSearchForm />

            {/* 右: アクションボタン */}
            <div className="flex items-center gap-2 shrink-0">
              {profile ? (
                <>
                  {/* ＋ 記録する */}
                  <Link
                    href="/record"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    記録する
                  </Link>

                  {/* アバタードロップダウン (Client Component) */}
                  <NavbarUserMenu profile={profile} />
                </>
              ) : viewer.status === "no_profile" ? (
                <Link
                  href="/profile/setup"
                  className="px-4 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors"
                >
                  プロフィール設定
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors"
                >
                  ログイン
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* SP ボトムナビ */}
      <BottomNav viewer={viewer} />
    </>
  );
}
