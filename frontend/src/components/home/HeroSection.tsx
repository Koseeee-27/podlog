import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="rounded-2xl bg-gradient-to-b from-rose-50 to-white px-6 py-16 text-center sm:py-20">
      <p className="text-sm font-medium text-rose-500 mb-3">
        ラジオリスナーのための記録・レビューサービス
      </p>
      <h1 className="text-2xl font-bold text-stone-900 sm:text-4xl leading-tight">
        聴いたラジオを記録して、
        <br />
        次に聴く番組と出会おう
      </h1>
      <p className="mt-4 text-sm text-stone-600 sm:text-base max-w-lg mx-auto">
        PodLog はポッドキャストの感想を記録・共有できるサービスです。
        <br className="hidden sm:inline" />
        あなたの「面白かった！」が、誰かの「次に聴く番組」になります。
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/login"
          className="inline-flex items-center rounded-lg bg-rose-500 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-600 transition-colors"
        >
          無料で始める
        </Link>
        <Link
          href="/discover"
          className="inline-flex items-center rounded-lg bg-white px-8 py-3 text-sm font-semibold text-stone-900 border border-stone-200 hover:bg-stone-50 transition-colors"
        >
          番組を探す
        </Link>
      </div>
    </section>
  );
}
