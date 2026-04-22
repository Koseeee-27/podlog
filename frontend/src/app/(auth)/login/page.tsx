import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "ログイン | PodLog",
  description: "Google アカウントで PodLog にログインします。",
  // 認証フローはクロール不要（screens.md の indexable=N）
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginClient />;
}
