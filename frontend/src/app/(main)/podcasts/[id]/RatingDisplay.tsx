interface RatingDisplayProps {
  averageRating?: number;
  totalRatings?: number;
}

/**
 * ポッドキャストの平均評価と総評価数を表示する。
 * 取得失敗は親の Server Component (RatingSection) が throw し
 * ErrorBoundary に委譲するため、ここではエラー状態を持たない。
 *
 * 評価/感想分離（podlog-workspace#59）に伴い、prop 名と表示文言を
 * `totalReviews` / 「件のレビュー」 → `totalRatings` / 「件の評価」 に
 * 切り替えた（podlog#393）。
 */
export default function RatingDisplay({
  averageRating,
  totalRatings,
}: RatingDisplayProps) {
  if (totalRatings === undefined || totalRatings === 0 || averageRating === undefined) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="text-base font-semibold text-stone-900">
          {averageRating.toFixed(1)}
        </span>
      </div>
      <span className="text-sm text-stone-500">
        ({totalRatings}件の評価)
      </span>
    </div>
  );
}
