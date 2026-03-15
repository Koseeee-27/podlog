import Link from "next/link";

export default function WelcomeSection() {
  return (
    <section className="rounded-xl border border-stone-200 bg-white px-6 py-12 text-center">
      <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">
        ラジオの記録、はじめよう。
      </h2>
      <p className="mt-3 text-stone-600">
        聴いた番組を記録して、新しい番組と出会おう
      </p>
      <div className="mt-8">
        <Link
          href="/login"
          className="inline-flex items-center rounded-lg bg-rose-500 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-rose-600 transition-colors"
        >
          ログインして始める
        </Link>
      </div>
    </section>
  );
}
