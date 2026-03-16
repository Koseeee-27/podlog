"use client";

import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginClient() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="px-4 py-4">
        <Link href="/" className="text-xl font-bold text-rose-600 hover:text-rose-700 transition-colors">
          PodLog
        </Link>
      </header>
      <div className="flex items-center justify-center px-4 pt-16 pb-24">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-stone-600">アカウントにログイン</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <LoginForm />
            <p className="mt-4 text-center text-sm text-stone-600">
              アカウントをお持ちでない方は{" "}
              <Link href="/signup" className="text-rose-600 hover:text-rose-500 font-medium">
                新規登録
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
