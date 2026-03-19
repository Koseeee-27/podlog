"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import type { EpisodeWithStats } from "@/types/episode";
import { formatDuration, formatDate } from "@/lib/utils";
import ListenButton from "./ListenButton";
import ReviewPrompt from "./ReviewPrompt";
import EpisodeReviewSection from "@/components/review/EpisodeReviewSection";
import LoginPromptButton from "@/components/ui/LoginPromptButton";

interface EpisodeDetailProps {
  episode: EpisodeWithStats;
  isLoggedIn: boolean;
}

export default function EpisodeDetail({ episode, isLoggedIn }: EpisodeDetailProps) {
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  // エピソードが変わったら ReviewPrompt をリセット
  useEffect(() => {
    setShowReviewPrompt(false);
  }, [episode.id]);

  const handleJustMarked = useCallback(() => {
    setShowReviewPrompt(true);
  }, []);
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
            onJustMarked={handleJustMarked}
            onUnmarked={() => setShowReviewPrompt(false)}
          />
        ) : (
          <LoginPromptButton label="ログインして記録する" />
        )}
      </div>

      <div className="mt-2">
        <Link
          href={`/podcasts/${episode.podcast_id}`}
          className="text-sm text-rose-600 hover:text-rose-700"
        >
          ポッドキャストに戻る
        </Link>
      </div>

      {episode.audio_url && (
        <div className="mt-6">
          <audio controls className="w-full" preload="none">
            <source src={episode.audio_url} />
          </audio>
        </div>
      )}

      {episode.description && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">説明</h2>
          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
            {episode.description}
          </p>
        </div>
      )}

      {episode.source_url && (
        <div className="mt-4">
          <a
            href={episode.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-700"
          >
            元のページで見る
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
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
        <EpisodeReviewSection key={`${episode.id}-${isLoggedIn}`} episodeId={episode.id} isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
}
