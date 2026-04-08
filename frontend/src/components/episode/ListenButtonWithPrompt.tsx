"use client";

import { useState } from "react";
import ListenButton from "./ListenButton";
import ReviewPrompt from "./ReviewPrompt";

interface ListenButtonWithPromptProps {
  episodeId: string;
  initialListened: boolean;
}

/**
 * 聴取ボタンとレビュー誘導を組み合わせたコンポーネント。
 * 「聴いた」を記録した直後にレビュー誘導を表示する。
 */
export default function ListenButtonWithPrompt({
  episodeId,
  initialListened,
}: ListenButtonWithPromptProps) {
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  return (
    <>
      <ListenButton
        episodeId={episodeId}
        initialListened={initialListened}
        onJustMarked={() => setShowReviewPrompt(true)}
        onUnmarked={() => setShowReviewPrompt(false)}
      />
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
    </>
  );
}
