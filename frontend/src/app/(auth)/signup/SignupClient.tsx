"use client";

import Image from "next/image";
import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupClient() {
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
      <div className="flex items-center justify-center px-4 pt-16 pb-24">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-stone-600">アカウントを作成</p>
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
    </div>
  );
}
