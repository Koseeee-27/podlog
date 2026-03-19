import { createClient } from "@/lib/supabase/server";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import PopularPodcastsSection from "@/components/home/PopularPodcastsSection";
import CtaSection from "@/components/home/CtaSection";
import TimelineSection from "@/components/home/TimelineSection";
import GreetingSection from "@/components/home/GreetingSection";
import RecentListeningSection from "@/components/home/RecentListeningSection";

export default async function TopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div className="space-y-8">
      {!isLoggedIn && <HeroSection />}

      {!isLoggedIn && <FeaturesSection />}

      {isLoggedIn && <GreetingSection />}

      {isLoggedIn && <RecentListeningSection />}

      <PopularPodcastsSection />

      <TimelineSection headingLevel={isLoggedIn ? "h2" : "h2"} />

      {!isLoggedIn && <CtaSection />}
    </div>
  );
}
