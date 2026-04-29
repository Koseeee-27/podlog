import type { Metadata } from "next";
import { stripHtmlTags } from "@/lib/utils";

/**
 * 共通の OG 画像設定（og-default.png のみを含む配列）。
 *
 * 主な用途:
 * - 静的ページ: `defaultOpenGraph` 経由で自動的に含まれるため、直接使う必要はない
 * - 動的ページ（podcast / episode / user）: ページ固有の artwork が**ない**
 *   ときのフォールバックとして使う。`artwork_url` が存在する場合は
 *   `images: [artwork_url]` のみを指定し、og-default は含めない方針
 *   （SNS クライアントの多くが先頭画像のみ採用するため、二重指定の意味が
 *   薄く、意図を明確にするため）。
 *   例: `images: artwork_url ? [artwork_url] : [...defaultOpenGraphImages]`
 */
export const defaultOpenGraphImages = [
  {
    url: "/og-default.png",
    width: 1200,
    height: 630,
    alt: "PodLog",
  },
] as const;

/**
 * 共通の OG 設定（siteName / locale / type / og-default.png）。
 *
 * Next.js の metadata マージは **shallow** で、ネストされたフィールド
 * （`openGraph` / `twitter` / `robots` 等）は子ページで指定すると
 * root layout の値が継承されず**置換される**。
 *
 * 子ページで openGraph を上書きするときは、この共通オブジェクトを
 * spread することで siteName / locale / type / og-default.png の
 * フォールバックを常に含める。
 *
 * 使用例:
 * ```ts
 * export const metadata: Metadata = {
 *   openGraph: {
 *     ...defaultOpenGraph,
 *     title: "探す | PodLog",
 *     url: "/discover",
 *   },
 * };
 * ```
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-metadata#merging
 */
// `defaultOpenGraphImages` を spread して新しい mutable 配列に展開する。
// `as const` 由来の `readonly` 型のままだと、Next.js の `Metadata["openGraph"]["images"]`
// (readonly を受けない型) と互換性が無くなるため、spread して mutable に変換する。
// 子ページが `images: [...defaultOpenGraphImages]` の形で再利用する場合も同じ理由。
export const defaultOpenGraph = {
  siteName: "PodLog",
  locale: "ja_JP",
  type: "website",
  images: [...defaultOpenGraphImages],
} satisfies NonNullable<Metadata["openGraph"]>;

/**
 * 共通の Twitter Card 設定（summary_large_image + og-default.png）。
 *
 * 子ページで twitter を上書きするときは spread して使う:
 * ```ts
 * twitter: {
 *   ...defaultTwitter,
 *   title: "探す | PodLog",
 * }
 * ```
 */
export const defaultTwitter = {
  card: "summary_large_image",
  images: ["/og-default.png"],
} satisfies NonNullable<Metadata["twitter"]>;

/**
 * description フィールド（`<meta name="description">` / `og:description` /
 * `twitter:description`）の上限文字数。
 *
 * SNS / 検索エンジンのプレビューで切り捨てが起きにくい一般的な目安として
 * 160 文字を採用している。
 */
export const METADATA_DESCRIPTION_MAX_LENGTH = 160;

/**
 * `generateMetadata` で使う description 文字列を組み立てる。
 *
 * RSS フィード由来の `<p>` / `<a>` 等が混じった本文を想定し、HTML タグの
 * 除去・最大長での切り詰め・空のときのフォールバックを 1 か所に集約する。
 * 動的ページ（podcast / episode / user）で同じ整形が必要なため共通化した。
 *
 * - `rawHtml` が `null` / `undefined` / 整形後に空文字 → `fallback` を返す
 * - 整形後が `maxLength` 文字を超える場合は `(maxLength - 1)` 文字で切り詰めて
 *   末尾に `…` を付ける。返り値の最大長は `maxLength` 文字に揃う（`…` 込みの長さで
 *   `maxLength` を超えない設計）
 * - 元が `maxLength` 文字以内ならそのまま返す（`…` を付けない）
 *
 * 使用例:
 * ```ts
 * const description = buildMetadataDescription(
 *   podcast.description,
 *   `${podcast.title} | PodLog`,
 * );
 * ```
 *
 * @param rawHtml HTML タグを含み得る本文（DB 由来の description / bio 等）
 * @param fallback `rawHtml` が空のときに使う代替文字列
 * @param maxLength 返り値の最大文字数（`…` 込み）。1 以上を想定し、1 未満の値は
 *   1 にクランプする（不変条件「返り値長 ≦ maxLength」を実装で守るため。負数や
 *   0 を渡すと `slice(0, maxLength - 1)` が負のオフセットになり、元の文字列の
 *   末尾を除いた値が返って不変条件を破る）。デフォルトは 160
 * @returns description フィールドにそのまま渡せる文字列。長さは最大 `max(1, maxLength)`。
 *   `fallback` 自体の長さは保証しない（呼び出し側で適切な長さの fallback を渡すこと）
 */
export function buildMetadataDescription(
  rawHtml: string | null | undefined,
  fallback: string,
  maxLength: number = METADATA_DESCRIPTION_MAX_LENGTH,
): string {
  // maxLength <= 0 のとき slice(0, maxLength - 1) が負のオフセットになり、
  // 「先頭から maxLength - 1 文字」ではなく「末尾の (maxLength - 1) 文字を除く」
  // 挙動になって不変条件「返り値長 ≦ maxLength」を破る。1 未満をクランプして
  // 防御する。本番で誤って 0 が渡るケースに対する fail-safe で、設計上は
  // 呼び出し側が正の数を渡す前提。
  const safeMax = Math.max(1, maxLength);

  if (!rawHtml) return fallback;
  const stripped = stripHtmlTags(rawHtml);
  if (stripped.length === 0) return fallback;
  if (stripped.length <= safeMax) return stripped;
  // 切り詰め後に `…` (1 文字) を付けても合計長が safeMax を超えないよう、
  // (safeMax - 1) 文字で slice する。safeMax === 1 のときは "…" のみ返る。
  return stripped.slice(0, safeMax - 1) + "…";
}

/**
 * og:image / twitter:image 用の URL を、空文字も「無し」扱いに正規化して返す。
 *
 * `artwork_url` / `avatar_url` 等は型上 `string | null | undefined` だが、
 * API レスポンスで空文字 `""` が紛れ込むケースがあり得る。null 合体演算子
 * (`??`) で複数候補を連結すると空文字を「値あり」として通してしまい、
 * `<meta property="og:image" content="">` という壊れたタグを出力する事故に
 * つながる。本ヘルパーで一律 truthy 判定（長さ 1 以上）に揃える。
 *
 * 使用例:
 * ```ts
 * // 単一候補
 * const ogImage = pickMetadataImage(podcast.artwork_url);
 *
 * // フォールバックチェーン
 * const ogImage =
 *   pickMetadataImage(episode.artwork_url) ??
 *   pickMetadataImage(episode.podcast.artwork_url);
 * ```
 *
 * @returns 値があれば URL 文字列、無ければ `null`
 */
export function pickMetadataImage(
  url: string | null | undefined,
): string | null {
  return url && url.length > 0 ? url : null;
}
