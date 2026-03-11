"use client";

import { useAuth } from "@/hooks/useAuth";
import { useTimeline } from "@/hooks/useReviews";
import WelcomeSection from "@/components/home/WelcomeSection";
import TimelineCard from "@/components/timeline/TimelineCard";
import Loading from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";

export default function TopPageClient() {
  const auth = useAuth();
  const { reviews, loading, error, hasMore, loadMore } = useTimeline();

  const isLoggedIn = auth.status === "authenticated" || auth.status === "no_profile";
  const showWelcome = auth.status !== "loading" && !isLoggedIn;

  return (
    <div>
      {showWelcome && (
        <div className="mb-8">
          <WelcomeSection />
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">
          みんなのレビュー
        </h2>
      </div>

      {loading && reviews.length === 0 && <Loading />}
      {error && <ErrorMessage message={error} />}

      {!loading && reviews.length === 0 && !error && (
        <p className="text-sm text-gray-500">まだレビューはありません</p>
      )}

      <div className="space-y-4">
        {reviews.map((item) => (
          <TimelineCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && reviews.length > 0 && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-6 w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "読み込み中..." : "もっと見る"}
        </button>
      )}
    </div>
  );
}
