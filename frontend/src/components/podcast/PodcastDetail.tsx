import Image from "next/image";
import type { Podcast } from "@/types/podcast";
import { stripHtmlTags } from "@/lib/utils";

interface PodcastDetailProps {
  podcast: Podcast;
  favoriteCount?: number;
  /** 評価（星・レビュー件数）を差し込むスロット */
  ratingSlot?: React.ReactNode;
  /** 好きな番組ボタン等を差し込むスロット */
  actions?: React.ReactNode;
}

export default function PodcastDetail({ podcast, favoriteCount, ratingSlot, actions }: PodcastDetailProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-6">
      {podcast.artwork_url ? (
        <Image
          src={podcast.artwork_url}
          alt={podcast.title}
          width={200}
          height={200}
          className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl object-cover flex-shrink-0 mx-auto sm:mx-0"
        />
      ) : (
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
          <svg className="h-16 w-16 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-stone-900">{podcast.title}</h1>
        {podcast.author && (
          <p className="text-stone-600 mt-1">{podcast.author}</p>
        )}
        {podcast.genre && (
          <span className="inline-block mt-2 px-3 py-1 text-sm bg-rose-50 text-rose-700 rounded-full">
            {podcast.genre}
          </span>
        )}
        <div className="mt-3 flex items-center gap-4">
          {ratingSlot}
          {favoriteCount !== undefined && favoriteCount > 0 && (
            <div className="flex items-center gap-1">
              <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-stone-500">
                {favoriteCount}人がお気に入り
              </span>
            </div>
          )}
        </div>
        {podcast.description && (
          <p className="mt-4 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
            {stripHtmlTags(podcast.description)}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {actions}
          {podcast.itunes_url && (
            <a
              href={podcast.itunes_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-700"
            >
              Apple Podcasts で見る
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
