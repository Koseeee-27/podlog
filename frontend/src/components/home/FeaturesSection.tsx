const features = [
  {
    icon: (
      <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "聴いた記録を残す",
    description: "エピソードを「聴いた」としてワンタップで記録。あなただけの聴取履歴が自然と溜まっていきます。",
  },
  {
    icon: (
      <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    title: "レビューで感想を共有",
    description: "星評価とコメントで感想を残せます。お気に入りのエピソードの魅力を他のリスナーに伝えましょう。",
  },
  {
    icon: (
      <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    title: "新しい番組を発見",
    description: "みんなのレビューや人気番組から、まだ知らない面白い番組に出会えます。「次に何を聴こう？」を解決します。",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-12">
      <h2 className="text-lg font-bold text-stone-900 text-center mb-2 sm:text-xl">
        PodLog でできること
      </h2>
      <p className="text-sm text-stone-500 text-center mb-8">
        記録して、振り返って、発見する。ラジオリスナーのための3つの体験。
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-stone-200 bg-white p-6 text-center"
          >
            <div className="flex justify-center mb-4">{feature.icon}</div>
            <h3 className="font-semibold text-stone-900">{feature.title}</h3>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
