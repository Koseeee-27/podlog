/**
 * /podcasts/[id] ページの Suspense fallback 用スケルトン。
 */

export function EpisodeSkeleton() {
  return (
    <div className="mt-8">
      <div className="h-6 w-28 bg-stone-200 rounded animate-pulse mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm animate-pulse"
          >
            <div className="h-4 bg-stone-100 rounded w-3/4" />
            <div className="h-3 bg-stone-100 rounded w-1/2 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
