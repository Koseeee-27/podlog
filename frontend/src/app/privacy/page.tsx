import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "プライバシーポリシー - PodLog",
  description: "PodLog のプライバシーポリシーです。",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "プライバシーポリシー - PodLog",
    description: "PodLog のプライバシーポリシーです。",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
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

      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-2xl font-bold text-stone-900">
          プライバシーポリシー
        </h1>
        <p className="mt-2 text-xs text-stone-500">最終更新日: 2026年4月2日</p>

        <div className="mt-8 space-y-8 text-sm text-stone-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              1. はじめに
            </h2>
            <p>
              PodLog（以下「本サービス」）は、ユーザーの皆さまのプライバシーを尊重し、個人情報の保護に努めます。本ポリシーでは、本サービスが収集する情報とその利用目的について説明します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              2. 収集する情報
            </h2>
            <p className="mb-3">
              本サービスでは、以下の情報を収集します。
            </p>

            <h3 className="text-base font-semibold text-stone-900 mb-2">
              2.1 アカウント情報
            </h3>
            <p className="mb-3">
              Google アカウントでのログイン時に、以下の情報を取得します。
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>メールアドレス</li>
              <li>表示名</li>
              <li>プロフィール画像</li>
            </ul>

            <h3 className="text-base font-semibold text-stone-900 mb-2">
              2.2 ユーザーが入力する情報
            </h3>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>聴取記録（聴いたエピソードの情報）</li>
              <li>レビュー・評価</li>
              <li>プロフィール情報（自己紹介文など）</li>
            </ul>

            <h3 className="text-base font-semibold text-stone-900 mb-2">
              2.3 自動的に収集される情報
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                アクセスログ（IPアドレス、ブラウザ情報、アクセス日時など）
              </li>
              <li>Cookie およびローカルストレージに保存される認証情報</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              3. 情報の利用目的
            </h2>
            <p className="mb-2">収集した情報は、以下の目的で利用します。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>本サービスの提供・運営</li>
              <li>ユーザー認証・アカウント管理</li>
              <li>サービスの改善・新機能の開発</li>
              <li>不正利用の防止</li>
              <li>お問い合わせへの対応</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              4. 情報の第三者提供
            </h2>
            <p>
              運営者は、法令に基づく場合を除き、ユーザーの個人情報を第三者に提供しません。ただし、本サービスの運営に必要な範囲で、以下のサービスを利用しています。
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <span className="font-medium">Supabase</span>
                （認証・データベース）
              </li>
              <li>
                <span className="font-medium">Google OAuth</span>
                （ログイン認証）
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              5. データの保管
            </h2>
            <p>
              ユーザーの情報は、サービス運営に必要な期間保管します。アカウントを削除した場合、関連する個人情報は合理的な期間内に削除します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              6. ユーザーの権利
            </h2>
            <p className="mb-2">
              ユーザーは、自身の個人情報について以下の権利を有します。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>情報の開示・訂正・削除の請求</li>
              <li>アカウントの削除</li>
            </ul>
            <p className="mt-2">
              これらのご請求は、本サービス内の設定画面または下記お問い合わせ先メールアドレスにて対応します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              7. Cookie について
            </h2>
            <p>
              本サービスでは、認証状態の維持のために Cookie
              を使用しています。ブラウザの設定で Cookie
              を無効にした場合、本サービスの一部機能が利用できなくなる可能性があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              8. ポリシーの変更
            </h2>
            <p>
              本ポリシーは、必要に応じて変更することがあります。変更後のポリシーは、本ページに掲載した時点で効力を生じます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              9. お問い合わせ
            </h2>
            <p>
              本ポリシーに関するお問い合わせは、以下のメールアドレスまでご連絡ください。
            </p>
            <p className="mt-2">
              メール:{" "}
              <a
                href="mailto:podlog.contact@gmail.com"
                className="text-rose-500 hover:text-rose-600 underline"
              >
                podlog.contact@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-stone-200">
          <Link
            href="/login"
            className="text-sm text-rose-500 hover:text-rose-600"
          >
            ログインページに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
