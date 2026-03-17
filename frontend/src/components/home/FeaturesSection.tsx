const features = [
  {
    icon: (
      <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    title: "聴いた記録を残す",
    description: "聴いたエピソードを記録して、自分だけの聴取履歴を作ろう。",
  },
  {
    icon: (
      <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    title: "レビューを書く",
    description: "お気に入りのエピソードにレビューを書いて、感想をシェアしよう。",
  },
  {
    icon: (
      <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    title: "新しい番組と出会う",
    description: "みんなのレビューを見て、まだ知らない番組を発見しよう。",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-12">
      <h2 className="text-lg font-bold text-stone-900 text-center mb-8 sm:text-xl">
        PodLog でできること
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-stone-200 bg-white p-6 text-center"
          >
            <div className="flex justify-center mb-4">{feature.icon}</div>
            <h3 className="font-semibold text-stone-900">{feature.title}</h3>
            <p className="mt-2 text-sm text-stone-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
