import { createClient } from "@/lib/supabase/server";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import CtaSection from "@/components/home/CtaSection";
import TimelineSection from "@/components/home/TimelineSection";

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

      <TimelineSection headingLevel={isLoggedIn ? "h1" : "h2"} />

      {!isLoggedIn && <CtaSection />}
    </div>
  );
}
