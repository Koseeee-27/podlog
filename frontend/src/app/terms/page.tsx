import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { defaultOpenGraph, defaultTwitter } from "@/lib/metadata/shared";

const PAGE_TITLE = "利用規約 | PodLog";
const PAGE_DESCRIPTION = "PodLog の利用規約です。";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/terms",
  },
  // openGraph / twitter は shallow merge で置換されるため spread で継承
  openGraph: {
    ...defaultOpenGraph,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/terms",
  },
  twitter: {
    ...defaultTwitter,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold text-stone-900">利用規約</h1>
        <p className="mt-2 text-xs text-stone-500">最終更新日: 2026年3月19日</p>

        <div className="mt-8 space-y-8 text-sm text-stone-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              第1条（適用）
            </h2>
            <p>
              本規約は、PodLog（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーの皆さまには、本規約に同意のうえ本サービスをご利用いただきます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              第2条（サービスの概要）
            </h2>
            <p>
              本サービスは、ラジオ・ポッドキャストの聴取記録やレビューを投稿・共有できる Web
              アプリケーションです。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              第3条（アカウント）
            </h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                ユーザーは、Google
                アカウントを使用して本サービスに登録・ログインします。
              </li>
              <li>
                アカウントの管理はユーザー自身の責任で行ってください。第三者による不正利用について、運営者は責任を負いません。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              第4条（禁止事項）
            </h2>
            <p className="mb-2">
              ユーザーは、本サービスの利用にあたり以下の行為を行ってはなりません。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>法令または公序良俗に反する行為</li>
              <li>他のユーザーや第三者の権利を侵害する行為</li>
              <li>虚偽の情報を登録・投稿する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>
                不正アクセス、リバースエンジニアリング、スクレイピング等の行為
              </li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              第5条（コンテンツ）
            </h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                ユーザーが投稿したレビュー等のコンテンツの著作権はユーザーに帰属します。
              </li>
              <li>
                運営者は、本サービスの提供・改善・宣伝の目的で、ユーザーが投稿したコンテンツを無償で利用できるものとします。
              </li>
              <li>
                運営者は、禁止事項に該当すると判断したコンテンツを、事前の通知なく削除できるものとします。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              第6条（免責事項）
            </h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                本サービスは「現状有姿」で提供されます。運営者は、サービスの完全性・正確性・継続性を保証しません。
              </li>
              <li>
                本サービスの利用に起因してユーザーに生じた損害について、運営者は一切の責任を負いません。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              第7条（サービスの変更・終了）
            </h2>
            <p>
              運営者は、事前の通知なく本サービスの内容を変更、または提供を終了できるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              第8条（規約の変更）
            </h2>
            <p>
              運営者は、必要に応じて本規約を変更できるものとします。変更後の規約は、本ページに掲載した時点で効力を生じます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">
              第9条（準拠法・管轄）
            </h2>
            <p>
              本規約の解釈には日本法を適用します。本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
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
