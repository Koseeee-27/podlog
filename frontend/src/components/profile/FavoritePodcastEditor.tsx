"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { searchPodcasts } from "@/lib/api/podcasts";
import { XMarkIcon, PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { FavoritePodcastItem } from "@/types/user";
import type { PodcastSearchItem } from "@/types/podcast";

interface FavoritePodcastEditorProps {
  podcasts: FavoritePodcastItem[];
  onChange: (podcasts: FavoritePodcastItem[]) => void;
}

export default function FavoritePodcastEditor({ podcasts, onChange }: FavoritePodcastEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  function handleRemove(podcastId: string) {
    onChange(podcasts.filter((p) => p.id !== podcastId));
  }

  function handleAdd(podcast: PodcastSearchItem) {
    // 重複チェック
    if (podcasts.some((p) => p.id === podcast.id)) return;

    const newItem: FavoritePodcastItem = {
      id: podcast.id,
      title: podcast.title,
      artwork_url: podcast.artwork_url ?? undefined,
    };
    onChange([...podcasts, newItem]);
    setIsDialogOpen(false);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-2">
        好きな番組
      </label>

      {podcasts.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {podcasts.map((podcast) => (
            <div
              key={podcast.id}
              className="flex flex-col items-center gap-1.5 w-20 relative group"
            >
              {podcast.artwork_url ? (
                <Image
                  src={podcast.artwork_url}
                  alt={podcast.title}
                  width={64}
                  height={64}
                  className="rounded-lg object-cover w-16 h-16"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-stone-200 flex items-center justify-center">
                  <span className="text-stone-400 text-xs">No img</span>
                </div>
              )}
              <span className="text-xs text-stone-700 text-center line-clamp-2">
                {podcast.title}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(podcast.id)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-stone-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label={`${podcast.title} を削除`}
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg px-3 py-1.5"
      >
        <PlusIcon className="w-4 h-4" />
        番組を追加
      </button>

      {isDialogOpen && (
        <PodcastSearchDialog
          existingIds={podcasts.map((p) => p.id)}
          onSelect={handleAdd}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  );
}

// --- 番組検索ダイアログ ---

interface PodcastSearchDialogProps {
  existingIds: string[];
  onSelect: (podcast: PodcastSearchItem) => void;
  onClose: () => void;
}

function PodcastSearchDialog({ existingIds, onSelect, onClose }: PodcastSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PodcastSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const performSearch = useCallback(async (q: string) => {
    if (q.trim().length === 0) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const items = await searchPodcasts(q);
      setResults(items);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 w-full max-w-md mx-auto mt-20 p-0 rounded-xl border border-stone-200 shadow-lg backdrop:bg-black/30"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-stone-900">番組を検索</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600"
            aria-label="閉じる"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="番組名で検索..."
            autoFocus
            className="block w-full rounded-lg border border-stone-200 pl-9 pr-3 py-2 text-sm placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>

        <div className="max-h-64 overflow-y-auto">
          {searching && (
            <p className="text-sm text-stone-500 text-center py-4">検索中...</p>
          )}

          {!searching && query.trim().length > 0 && results.length === 0 && (
            <p className="text-sm text-stone-500 text-center py-4">
              検索結果が見つかりませんでした
            </p>
          )}

          {!searching && results.length > 0 && (
            <ul className="divide-y divide-stone-100">
              {results.map((podcast) => {
                const alreadyAdded = existingIds.includes(podcast.id);
                return (
                  <li key={podcast.id}>
                    <button
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => onSelect(podcast)}
                      className="w-full flex items-center gap-3 px-2 py-3 text-left hover:bg-stone-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {podcast.artwork_url ? (
                        <Image
                          src={podcast.artwork_url}
                          alt={podcast.title}
                          width={40}
                          height={40}
                          className="rounded-lg object-cover w-10 h-10 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-stone-400 text-xs">No img</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">
                          {podcast.title}
                        </p>
                        {podcast.author && (
                          <p className="text-xs text-stone-500 truncate">
                            {podcast.author}
                          </p>
                        )}
                      </div>
                      {alreadyAdded && (
                        <span className="ml-auto text-xs text-stone-400 flex-shrink-0">
                          追加済み
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}
