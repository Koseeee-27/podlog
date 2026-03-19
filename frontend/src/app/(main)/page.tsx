import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import PopularPodcastsSection from "@/components/home/PopularPodcastsSection";
import CtaSection from "@/components/home/CtaSection";
import TimelineSection from "@/components/home/TimelineSection";
import GreetingSection from "@/components/home/GreetingSection";
import RecentListeningSection from "@/components/home/RecentListeningSection";
import {
  PopularPodcastsSkeleton,
  TimelineSkeleton,
  RecentListeningSkeleton,
} from "@/components/home/skeletons";
import type { User } from "@/types/user";

export default async function TopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // ログイン済みの場合、プロフィール情報を取得する
  let profile: User | null = null;
  if (isLoggedIn) {
    try {
      profile = await serverGet<User>("/users/me");
    } catch {
      // プロフィール取得に失敗した場合は未設定として扱う
    }
  }

  return (
    <div className="space-y-8">
      {!isLoggedIn && <HeroSection />}

      {!isLoggedIn && <FeaturesSection />}

      {isLoggedIn && profile && (
        <GreetingSection displayName={profile.display_name} />
      )}

      {isLoggedIn && profile && (
        <Suspense fallback={<RecentListeningSkeleton />}>
          <RecentListeningSection username={profile.username} />
        </Suspense>
      )}

      <Suspense fallback={<PopularPodcastsSkeleton />}>
        <PopularPodcastsSection />
      </Suspense>

      <Suspense fallback={<TimelineSkeleton />}>
        <TimelineSection headingLevel={isLoggedIn ? "h2" : "h2"} />
      </Suspense>

      {!isLoggedIn && <CtaSection />}
    </div>
  );
}
