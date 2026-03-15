"use client";

import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginClient() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900">podlog</h1>
          <p className="mt-2 text-stone-600">ポッドキャスト記録アプリにログイン</p>
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
  );
}
