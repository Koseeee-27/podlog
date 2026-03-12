import Link from "next/link";

export default function WelcomeSection() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
      <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
        ラジオの記録、はじめよう。
      </h2>
      <p className="mt-3 text-gray-600">
        聴いた番組を記録して、新しい番組と出会おう
      </p>
      <div className="mt-8">
        <Link
          href="/login"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          ログインして始める
        </Link>
      </div>
    </section>
  );
}
