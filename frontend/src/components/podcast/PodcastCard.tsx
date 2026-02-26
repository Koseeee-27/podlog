import Link from "next/link";
import Image from "next/image";
import type { Podcast } from "@/types/podcast";

interface PodcastCardProps {
  podcast: Podcast;
}

export default function PodcastCard({ podcast }: PodcastCardProps) {
  return (
    <Link
      href={`/podcasts/${podcast.id}`}
      className="flex gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      {podcast.artwork_url ? (
        <Image
          src={podcast.artwork_url}
          alt={podcast.title}
          width={80}
          height={80}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-gray-900 truncate">{podcast.title}</h3>
        {podcast.author && (
          <p className="text-sm text-gray-500 mt-0.5">{podcast.author}</p>
        )}
        {podcast.genre && (
          <span className="inline-block mt-1.5 px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-full">
            {podcast.genre}
          </span>
        )}
      </div>
    </Link>
  );
}
