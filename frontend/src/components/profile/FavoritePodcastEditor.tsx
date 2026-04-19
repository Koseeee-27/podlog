"use client";

import { useState, useRef, useEffect, useTransition } from "react";
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
  // inputValue: input 要素の制御用（入力中の値を全部保持）
  // query: 実際に検索した確定クエリ（結果表示や「見つかりませんでした」表示のトリガ）
  // 2 つを分離することで、入力中に結果が勝手に更新される問題（クエリと結果の不一致）を防ぐ
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PodcastSearchItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      isMountedRef.current = false;
      // cleanup 時は close() を呼ばない（onClose 発火を防ぐ）
      // React が DOM から除去するので dialog は自然に閉じる
    };
  }, []);

  function handleInputChange(value: string) {
    setInputValue(value);
    // 入力を空にしたら検索結果もクリア（query と results の整合を保つ）
    if (value.trim().length === 0) {
      setQuery("");
      setResults([]);
    }
  }

  function handleSearchSubmit() {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) return;

    setQuery(trimmed);
    startTransition(async () => {
      try {
        const items = await searchPodcasts(trimmed);
        setResults(items);
      } catch {
        setResults([]);
      }
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => {
        // unmount 後の close イベント（Strict Mode 等）は無視
        if (isMountedRef.current) {
          onClose();
        }
      }}
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
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              // IME 変換中の Enter（確定キー）は検索を発火させない
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSearchSubmit();
              }
            }}
            placeholder="番組名で検索..."
            aria-label="番組を検索"
            autoFocus
            className="block w-full rounded-lg border border-stone-200 pl-9 pr-3 py-2 text-sm placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>

        <div className="max-h-64 overflow-y-auto">
          {isPending && (
            <p className="text-sm text-stone-500 text-center py-4">検索中...</p>
          )}

          {!isPending && query.trim().length > 0 && results.length === 0 && (
            <p className="text-sm text-stone-500 text-center py-4">
              検索結果が見つかりませんでした
            </p>
          )}

          {!isPending && results.length > 0 && (
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
