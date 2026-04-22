import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import { defaultOpenGraph, defaultTwitter } from "@/lib/metadata/shared";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const SITE_TITLE = "PodLog - ラジオの記録・レビューアプリ";
const SITE_DESCRIPTION =
  "聴いたラジオの記録と感想を残し、新しい番組に出会えるサービス";

export const metadata: Metadata = {
  // metadataBase: ルートで一度だけ設定。各ページの alternates.canonical や
  // openGraph.images は相対パスで書けば自動的に絶対 URL に解決される。
  metadataBase: new URL(siteUrl),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // alternates は **layout には設定しない**。Next.js metadata は shallow merge
  // のため、layout に canonical を置くと子ページが alternates を上書きしない限り
  // 親の値を継承してしまい、動的ページ（/podcasts/[id] 等）が canonical="/" を
  // 出力するという SEO 事故につながる。canonical は各 page.tsx で個別に設定する
  // （ホームは app/(main)/page.tsx 側で設定）。
  openGraph: {
    ...defaultOpenGraph,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    ...defaultTwitter,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          <ToastProvider>{children}</ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
