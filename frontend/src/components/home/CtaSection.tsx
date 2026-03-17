import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="rounded-2xl bg-stone-900 px-6 py-12 text-center sm:py-16">
      <h2 className="text-xl font-bold text-white sm:text-2xl">
        今すぐ PodLog を始めよう
      </h2>
      <p className="mt-3 text-sm text-stone-300">
        無料で使えます。Google アカウントで簡単に始められます。
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
