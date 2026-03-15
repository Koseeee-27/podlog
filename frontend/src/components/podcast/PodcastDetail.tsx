import Image from "next/image";
import type { Podcast } from "@/types/podcast";

interface PodcastDetailProps {
  podcast: Podcast;
  averageRating?: number;
  totalReviews?: number;
}

export default function PodcastDetail({ podcast, averageRating, totalReviews }: PodcastDetailProps) {
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
        {totalReviews !== undefined && totalReviews > 0 && averageRating !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-base font-semibold text-stone-900">
                {averageRating?.toFixed(1)}
              </span>
            </div>
            <span className="text-sm text-stone-500">
              ({totalReviews}件のレビュー)
            </span>
          </div>
        )}
        {podcast.description && (
          <p className="mt-4 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
            {podcast.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
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
