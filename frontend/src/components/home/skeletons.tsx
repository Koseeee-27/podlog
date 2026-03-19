/**
 * ホーム画面の各セクション用スケルトン UI。
 * Suspense の fallback として使用する。
 */

export function GreetingSkeleton() {
  return (
    <section className="py-4">
      <div className="h-8 w-48 bg-stone-200 rounded animate-pulse" />
    </section>
  );
}

export function PopularPodcastsSkeleton() {
  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-24 bg-stone-200 rounded animate-pulse" />
        <div className="h-4 w-16 bg-stone-200 rounded animate-pulse" />
      </div>
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
    </section>
  );
}

export function TimelineSkeleton() {
  return (
    <section>
      <div className="h-5 w-32 bg-stone-200 rounded animate-pulse mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm animate-pulse"
          >
            <div className="flex gap-3">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-stone-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-stone-100" />
                  <div className="h-3 w-16 bg-stone-100 rounded" />
                </div>
                <div className="h-4 bg-stone-100 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecentListeningSkeleton() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-28 bg-stone-200 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm animate-pulse"
          >
            <div className="h-4 bg-stone-100 rounded w-2/3" />
            <div className="flex items-center gap-2 mt-1">
              <div className="h-3 bg-stone-100 rounded w-1/4" />
              <div className="h-3 bg-stone-100 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
