import { Suspense } from "react";
import { cookies } from "next/headers";
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

/**
 * トップページ。
 * 認証 Cookie の有無で初期表示を出し分ける。
 * ログイン済みの場合は RecentListeningSection（Server Component）で
 * サーバーサイドでデータを取得する。
 */
export default async function TopPage() {
  const cookieStore = await cookies();
  const maybeLoggedIn = cookieStore.getAll().some(
    (c) => c.name.startsWith("sb-")
  );

  return (
    <div className="space-y-8">
      {maybeLoggedIn ? (
        <Suspense fallback={<RecentListeningSkeleton />}>
          <RecentListeningSection />
        </Suspense>
      ) : (
        <>
          <HeroSection />
          <FeaturesSection />
        </>
      )}

      <Suspense fallback={<PopularPodcastsSkeleton />}>
        <PopularPodcastsSection />
      </Suspense>

      <Suspense fallback={<TimelineSkeleton />}>
        <TimelineSection />
      </Suspense>

      {!maybeLoggedIn && <CtaSection />}
    </div>
  );
}
