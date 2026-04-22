import type { Metadata } from "next";

/**
 * 共通の OG 画像設定。
 *
 * 各ページで `openGraph.images` を個別に指定したいとき、
 * 既存の og-default.png をフォールバックとして含めるために spread する。
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
