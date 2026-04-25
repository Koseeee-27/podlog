import type { Metadata } from "next";
import { defaultOpenGraph, defaultTwitter } from "@/lib/metadata/shared";
import LoginClient from "./LoginClient";

const PAGE_TITLE = "ログイン | PodLog";
const PAGE_DESCRIPTION = "Google アカウントで PodLog にログインします。";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  // 認証フローはクロール不要（screens.md の indexable=N）
  robots: { index: false, follow: false },
  // openGraph / twitter は shallow merge で layout の値が継承されるため、
  // ページ固有の og:title / og:description にするには各ページで spread が必要
  openGraph: {
    ...defaultOpenGraph,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  twitter: {
    ...defaultTwitter,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
