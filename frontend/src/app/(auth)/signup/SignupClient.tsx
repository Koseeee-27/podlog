"use client";

import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupClient() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-900">podlog</h1>
          <p className="mt-2 text-stone-600">アカウントを作成</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <SignupForm />
          <p className="mt-4 text-center text-sm text-stone-600">
            すでにアカウントをお持ちの方は{" "}
            <Link href="/login" className="text-rose-600 hover:text-rose-500 font-medium">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
