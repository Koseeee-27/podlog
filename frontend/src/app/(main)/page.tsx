import { createClient } from "@/lib/supabase/server";
import WelcomeSection from "@/components/home/WelcomeSection";
import TimelineSection from "@/components/home/TimelineSection";

export default async function TopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div>
      {!isLoggedIn && (
        <div className="mb-8">
          <WelcomeSection />
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">
          みんなのレビュー
        </h1>
      </div>

      <TimelineSection />
    </div>
  );
}
