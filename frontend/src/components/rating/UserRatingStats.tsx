interface UserRatingStatsProps {
  /** 評価の総件数 */
  totalRatings: number;
  /** 平均評価（1〜5、`totalRatings` が 0 のときは表示されない） */
  averageRating: number;
}

/**
 * ユーザーページの評価統計サマリー（screens.md「評価サマリーセクション（統計のみ）」）。
 *
 * 旧モデル（reviews）ではユーザーページに「rating + comment 同居のレビュー一覧」を
 * 表示していたが、評価/感想分離（podlog-workspace#59）の新モデルでは:
 *  - 評価: 星のみで情報量が小さく、誰が何に星を付けたかの羅列はノイズ → サマリーに集約
 *  - 感想: 本文中心で読み物として価値がある → 一覧表示（podlog#391 系で実装）
 *
 * という分離方針のもと、ユーザーページでは個別の評価レコードを表示せず、件数と
 * 平均値のみを示す。screens.md L744 に従い、評価 0 件のときは「まだ評価がありません」
 * を表示する。
 */
export default function UserRatingStats({
  totalRatings,
  averageRating,
}: UserRatingStatsProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 mb-3">評価サマリー</h2>
      {totalRatings > 0 ? (
        <div className="flex items-center gap-3 text-sm text-stone-700">
          <span>
            <span className="font-semibold text-stone-900">{totalRatings}</span>{" "}
            件評価
          </span>
          <span className="text-stone-300" aria-hidden="true">/</span>
          <span className="flex items-center gap-1">
            平均
            <span className="text-yellow-500" aria-hidden="true">★</span>
            <span className="font-semibold text-stone-900">
              {averageRating.toFixed(1)}
            </span>
          </span>
        </div>
      ) : (
        <p className="text-sm text-stone-500">まだ評価がありません</p>
      )}
    </section>
  );
}
