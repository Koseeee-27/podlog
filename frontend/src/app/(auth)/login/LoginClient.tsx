"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function LoginClient() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    if (!supabaseRef.current) supabaseRef.current = createClient();

    const { error } = await supabaseRef.current.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="px-4 py-4">
        <Link href="/">
          <Image
            src="/logo-horizontal.png"
            alt="PodLog"
            width={120}
            height={28}
            priority
          />
        </Link>
      </header>

      <div className="flex items-center justify-center px-4 pt-12 pb-24">
        <div className="w-full max-w-md">
          {/* サービス紹介 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-stone-900">
              PodLog にログイン
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              聴いたポッドキャストを記録して、
              <br className="sm:hidden" />
              レビューを書いて、新しい番組と出会おう。
            </p>
          </div>

          {/* ログインカード */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            {error && (
              <div className="mb-4">
                <ErrorMessage message={error} />
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 text-stone-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Google アカウントで続ける
            </button>

            <p className="mt-4 text-center text-xs text-stone-500">
              アカウントをお持ちでない場合も、
              <br />
              Google アカウントで自動的に登録されます。
            </p>
          </div>

          {/* 利用規約・プライバシーポリシー */}
          <p className="mt-6 text-center text-xs text-stone-400">
            ログインすることで、
            <Link href="/terms" className="text-stone-500 underline hover:text-stone-700">
              利用規約
            </Link>
            と
            <Link href="/privacy" className="text-stone-500 underline hover:text-stone-700">
              プライバシーポリシー
            </Link>
            に同意したものとみなされます。
          </p>

          {/* サービスの特徴（簡潔な3ポイント） */}
          <div className="mt-10 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900">聴いた記録を残す</p>
                <p className="text-xs text-stone-500">エピソードを記録して自分だけの聴取履歴を作ろう</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900">レビューを書く</p>
                <p className="text-xs text-stone-500">お気に入りのエピソードの感想をシェアしよう</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900">新しい番組と出会う</p>
                <p className="text-xs text-stone-500">みんなのレビューを見て、まだ知らない番組を発見しよう</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
