import { Suspense } from "react";
import { cookies } from "next/headers";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import PopularPodcastsSection from "@/components/home/PopularPodcastsSection";
import CtaSection from "@/components/home/CtaSection";
import TimelineSection from "@/components/home/TimelineSection";
import LoggedInHome from "@/components/home/LoggedInHome";
import {
  PopularPodcastsSkeleton,
  TimelineSkeleton,
  RecentListeningSkeleton,
} from "@/components/home/skeletons";

/**
 * トップページ。
 * 認証 Cookie の有無で初期表示を出し分ける（getUser() は呼ばない）。
 * Cookie がある = ログイン済みの可能性が高いが、100% 保証はしない。
 * 確実な認証状態はクライアント側の useAuth で判定する。
 */
export default async function TopPage() {
  const cookieStore = await cookies();
  const maybeLoggedIn = cookieStore.getAll().some(
    (c) => c.name.startsWith("sb-")
  );

  return (
    <div className="space-y-8">
      {maybeLoggedIn ? (
        // ログイン済み（推定）: クライアント側で正確な認証状態を判定して表示
        <Suspense fallback={<RecentListeningSkeleton />}>
          <LoggedInHome />
        </Suspense>
      ) : (
        // 未ログイン: マーケティング UI を表示
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
