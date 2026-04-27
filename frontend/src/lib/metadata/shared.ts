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
 * - 整形後が `maxLength` 文字を超える場合は `maxLength` 文字で切り詰めて末尾に `…` を付ける
 *   （切り詰め発生時のみ `…` を付ける挙動。元が `maxLength` 文字以内ならそのまま返す）
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
 * @param maxLength 切り詰めの上限文字数。デフォルトは 160
 * @returns description フィールドにそのまま渡せる文字列
 */
export function buildMetadataDescription(
  rawHtml: string | null | undefined,
  fallback: string,
  maxLength: number = METADATA_DESCRIPTION_MAX_LENGTH,
): string {
  if (!rawHtml) return fallback;
  const stripped = stripHtmlTags(rawHtml);
  if (stripped.length === 0) return fallback;
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength) + "…";
}
