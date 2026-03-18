import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="rounded-2xl bg-stone-900 px-6 py-12 text-center sm:py-16">
      <h2 className="text-xl font-bold text-white sm:text-2xl">
        あなたのラジオ体験を記録しよう
      </h2>
      <p className="mt-3 text-sm text-stone-300 max-w-md mx-auto">
        聴いた番組の記録、レビューの投稿、新しい番組の発見。
        <br className="hidden sm:inline" />
        すべて無料で、Google アカウントですぐに始められます。
      </p>
      <div className="mt-8">
        <Link
          href="/login"
          className="inline-flex items-center rounded-lg bg-rose-500 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-600 transition-colors"
        >
          無料で始める
        </Link>
      </div>
    </section>
  );
}
