/**
 * /discover ページ遷移時のスケルトン UI。
 * 実際のレイアウトに合わせた灰色ブロックを表示し、体感速度を改善する。
 */
export default function DiscoverLoading() {
  return (
    <div>
      <h1 className="sr-only">探す</h1>

      {/* 検索バーのスケルトン */}
      <div className="h-12 bg-stone-100 rounded-xl animate-pulse" />

      <div className="mt-6">
        {/* ジャンルグリッドのスケルトン */}
        <section aria-label="ジャンルから探す">
          <div className="h-7 w-40 bg-stone-100 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-stone-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </section>

        {/* 人気番組のスケルトン */}
        <section className="mt-8" aria-label="人気の番組">
          <div className="h-7 w-32 bg-stone-100 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 bg-stone-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
