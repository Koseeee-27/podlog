/**
 * /record ページの Suspense fallback 用スケルトン UI。
 */

/** 新着エピソードセクションのスケルトン（番組グループ × 2） */
export function RecentEpisodesSkeleton() {
  return (
    <section className="mt-8">
      {/* 見出し */}
      <div className="h-5 w-56 bg-stone-200 rounded animate-pulse mb-3" />

      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, groupIdx) => (
          <div key={groupIdx}>
            {/* 番組ヘッダー: アートワーク + 番組名 */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-stone-100 flex-shrink-0 animate-pulse" />
              <div className="h-4 bg-stone-100 rounded w-32 animate-pulse" />
            </div>

            {/* エピソード行 × 3 */}
            <div className="space-y-1.5 ml-[52px]">
              {Array.from({ length: 3 }).map((_, epIdx) => (
                <div
                  key={epIdx}
                  className="rounded-lg bg-white p-2 animate-pulse"
                >
                  <div className="h-3.5 bg-stone-100 rounded w-3/4" />
                  <div className="h-3 bg-stone-100 rounded w-1/3 mt-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** エピソード一覧のスケルトン（番組選択後） */
export function EpisodeListSkeleton() {
  return (
    <div>
      {/* 戻るボタン */}
      <div className="h-4 w-28 bg-stone-100 rounded animate-pulse mb-4" />

      {/* 番組ヘッダー */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-stone-100 flex-shrink-0 animate-pulse" />
        <div className="h-5 bg-stone-100 rounded w-40 animate-pulse" />
      </div>

      {/* エピソード行 */}
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
