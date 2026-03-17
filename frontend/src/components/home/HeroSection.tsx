import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="rounded-2xl bg-gradient-to-b from-rose-50 to-white px-6 py-16 text-center sm:py-20">
      <h1 className="text-2xl font-bold text-stone-900 sm:text-4xl leading-tight">
        ポッドキャストの感想を、
        <br />
        みんなでシェアしよう
      </h1>
      <p className="mt-4 text-sm text-stone-600 sm:text-base">
        聴いた番組を記録して、レビューを書いて、新しいお気に入りの番組と出会おう。
      </p>
      <div className="mt-8">
        <Link
          href="/login"
          className="inline-flex items-center rounded-lg bg-rose-500 px-8 py-3 text-sm font-medium text-white shadow-sm hover:bg-rose-600 transition-colors"
        >
          Google で始める
        </Link>
      </div>
    </section>
  );
}
