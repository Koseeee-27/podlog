import Image from "next/image";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { PodcastSearchItem } from "@/types/podcast";

interface PodcastSelectCardProps {
  podcast: PodcastSearchItem;
  onSelect: (podcast: PodcastSearchItem) => void;
}

/**
 * 番組選択用のカード。クリックで番組を選択する（ページ遷移しない）。
 * 記録ページの番組検索結果で使用する。
 */
export default function PodcastSelectCard({ podcast, onSelect }: PodcastSelectCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(podcast)}
      className="flex items-center gap-3 w-full p-3 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow text-left"
    >
      {podcast.artwork_url ? (
        <Image
          src={podcast.artwork_url}
          alt={podcast.title}
          width={48}
          height={48}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
          <svg className="h-5 w-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-stone-900 truncate">{podcast.title}</h3>
        {podcast.author && (
          <p className="text-xs text-stone-500 mt-0.5 truncate">{podcast.author}</p>
        )}
      </div>
      <ChevronRightIcon className="w-4 h-4 text-stone-400 flex-shrink-0" />
    </button>
  );
}
