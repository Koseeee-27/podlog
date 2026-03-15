import Image from "next/image";
import type { Podcast } from "@/types/podcast";

interface PodcastDetailProps {
  podcast: Podcast;
}

export default function PodcastDetail({ podcast }: PodcastDetailProps) {
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
