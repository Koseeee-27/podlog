import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import PopularPodcastsSection from "@/components/home/PopularPodcastsSection";
import CtaSection from "@/components/home/CtaSection";
import TimelineSection from "@/components/home/TimelineSection";
import RecentListeningSection from "./RecentListeningSection";
import {
  PopularPodcastsSkeleton,
  TimelineSkeleton,
  RecentListeningSkeleton,
} from "@/components/home/skeletons";

// ホームページの canonical。title / description / openGraph / twitter は
// root layout から継承する（shallow merge のため alternates だけ上書きする）。
// layout 側に canonical を置かない設計とセットで、動的ページが誤って canonical="/"
// を継承する SEO 事故を防ぐ（PR #380 レビュー指摘参照）。
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

/**
 * トップページ。
 * 認証 Cookie の有無で初期表示を出し分ける。
 * ログイン済みの場合は RecentListeningSection（Server Component）で
 * サーバーサイドでデータを取得する。
 * 各セクションを ErrorBoundary でラップし、1 セクションの失敗がページ全体に伝播するのを防ぐ。
 */
export default async function TopPage() {
  const cookieStore = await cookies();
  const maybeLoggedIn = cookieStore.getAll().some(
    (c) => c.name.startsWith("sb-")
  );

  return (
    <div className="space-y-8">
      {maybeLoggedIn ? (
        <ErrorBoundary>
          <Suspense fallback={<RecentListeningSkeleton />}>
            <RecentListeningSection />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <>
          <HeroSection />
          <FeaturesSection />
        </>
      )}

      <ErrorBoundary>
        <Suspense fallback={<PopularPodcastsSkeleton />}>
          <PopularPodcastsSection />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<TimelineSkeleton />}>
          <TimelineSection />
        </Suspense>
      </ErrorBoundary>

      {!maybeLoggedIn && <CtaSection />}
    </div>
  );
}
