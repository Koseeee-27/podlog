/**
 * /discover ページの各セクション用スケルトン UI。
 * Suspense の fallback として使用する。
 */

/** 検索結果のスケルトン */
export function SearchResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm animate-pulse"
        >
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-lg bg-stone-100 flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-stone-100 rounded w-3/4" />
              <div className="h-3 bg-stone-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** ジャンル別番組一覧のスケルトン */
export function GenrePodcastsSkeleton() {
  return (
    <>
      <div className="h-4 w-32 bg-stone-100 rounded animate-pulse mb-4" />
      <div className="h-7 w-48 bg-stone-100 rounded animate-pulse mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm animate-pulse"
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-lg bg-stone-100 flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-stone-100 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** 初期表示（ジャンルグリッド + 人気番組）のスケルトン */
export function DefaultSectionSkeleton() {
  return (
    <>
      <section>
        <div className="h-7 w-40 bg-stone-100 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-stone-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
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
    </>
  );
}
