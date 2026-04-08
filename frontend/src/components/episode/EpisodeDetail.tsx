"use client";

import { useState } from "react";
import Link from "next/link";
import type { EpisodeDetailResult } from "@/types/episode";
import { formatDuration, formatDate, stripHtmlTags } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import ListenButton from "./ListenButton";
import ReviewPrompt from "./ReviewPrompt";
import EpisodeReviewSection from "@/components/review/EpisodeReviewSection";
import LoginPromptButton from "@/components/ui/LoginPromptButton";

interface EpisodeDetailProps {
  episode: EpisodeDetailResult;
}

export default function EpisodeDetail({ episode }: EpisodeDetailProps) {
  const auth = useAuth();
  const isLoggedIn = auth.status === "authenticated" || auth.status === "no_profile";
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  function handleJustMarked() {
    setShowReviewPrompt(true);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">{episode.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-stone-500">
        {episode.published_at && <span>{formatDate(episode.published_at)}</span>}
        {episode.duration_ms && <span>{formatDuration(episode.duration_ms)}</span>}
        {episode.total_reviews > 0 && (
          <span>
            {episode.average_rating.toFixed(1)} ({episode.total_reviews}件のレビュー)
          </span>
        )}
      </div>

      <div className="mt-4">
        {isLoggedIn ? (
          <ListenButton
            episodeId={episode.id}
            initialListened={false}
            onJustMarked={handleJustMarked}
            onUnmarked={() => setShowReviewPrompt(false)}
          />
        ) : (
          <LoginPromptButton label="ログインして記録する" />
        )}
      </div>

      <div className="mt-2">
        <Link
          href={`/podcasts/${episode.podcast.id}`}
          className="text-sm text-rose-600 hover:text-rose-700"
        >
          ポッドキャストに戻る
        </Link>
      </div>

      {episode.description && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">説明</h2>
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
            {stripHtmlTags(episode.description)}
          </p>
        </div>
      )}


      {showReviewPrompt && (
        <div className="mt-4">
          <ReviewPrompt
            onClickReview={() => {
              setShowReviewPrompt(false);
              document.getElementById("review-section")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>
      )}

      <hr className="my-8 border-stone-200" />

      <div id="review-section">
        <EpisodeReviewSection key={episode.id} episodeId={episode.id} />
      </div>
    </div>
  );
}
