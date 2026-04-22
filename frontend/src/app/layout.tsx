import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
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

export const metadata: Metadata = {
  // metadataBase: ルートで一度だけ設定。各ページの alternates.canonical や
  // openGraph.images は相対パスで書けば自動的に絶対 URL に解決される。
  metadataBase: new URL(siteUrl),
  title: "PodLog - ラジオの記録・レビューアプリ",
  description:
    "聴いたラジオの記録と感想を残し、新しい番組に出会えるサービス",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    siteName: "PodLog",
    locale: "ja_JP",
    type: "website",
    title: "PodLog - ラジオの記録・レビューアプリ",
    description:
      "聴いたラジオの記録と感想を残し、新しい番組に出会えるサービス",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "PodLog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PodLog - ラジオの記録・レビューアプリ",
    description:
      "聴いたラジオの記録と感想を残し、新しい番組に出会えるサービス",
    images: ["/og-default.png"],
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
