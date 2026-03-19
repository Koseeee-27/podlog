"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  adminCreatePodcast,
  adminCreateEpisode,
  type CreatePodcastInput,
  type CreateEpisodeInput,
} from "@/lib/api/admin";
import { adminCreatePodcastSchema, adminCreateEpisodeSchema } from "@/lib/schemas/admin";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { ApiRequestError } from "@/types/api";

type Tab = "podcast" | "episode";

export default function AdminClient() {
  const [activeTab, setActiveTab] = useState<Tab>("podcast");

  // 認証・管理者チェックは Server Component (page.tsx) で完了済み
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheckIcon className="w-6 h-6 text-rose-500" />
        <h1 className="text-2xl font-bold text-stone-900">管理画面</h1>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("podcast")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "podcast"
              ? "bg-rose-500 text-white"
              : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          番組登録
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("episode")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "episode"
              ? "bg-rose-500 text-white"
              : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
          }`}
        >
          エピソード登録
        </button>
      </div>

      {activeTab === "podcast" && <PodcastForm />}
      {activeTab === "episode" && <EpisodeForm />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  番組登録フォーム                                                     */
/* ------------------------------------------------------------------ */

function PodcastForm() {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState<CreatePodcastInput>({
    title: "",
    author: "",
    description: "",
    artwork_url: "",
    genre: "",
  });

  const updateField = (field: keyof CreatePodcastInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = adminCreatePodcastSchema.safeParse({
      title: form.title.trim(),
      author: form.author?.trim() || undefined,
      description: form.description?.trim() || undefined,
      artwork_url: form.artwork_url?.trim() || undefined,
      genre: form.genre?.trim() || undefined,
    });

    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      try {
        // 空文字列のフィールドは送信しない
        const payload: CreatePodcastInput = { title: validation.data.title };
        if (validation.data.author) payload.author = validation.data.author;
        if (validation.data.description) payload.description = validation.data.description;
        if (validation.data.artwork_url) payload.artwork_url = validation.data.artwork_url;
        if (validation.data.genre) payload.genre = validation.data.genre;

        const result = await adminCreatePodcast(payload);
        showToast(`番組「${result.title}」を登録しました`);
        setForm({ title: "", author: "", description: "", artwork_url: "", genre: "" });
      } catch (err) {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError("登録に失敗しました");
        }
      }
    });
  };

  return (
    <Card padding="lg">
      <h2 className="text-xl font-semibold text-stone-900 mb-4">番組の手動登録</h2>
      <p className="text-sm text-stone-500 mb-6">
        RSS フィードがない番組（Spotify 独占配信など）を手動で登録します。
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="podcast-title"
          label="タイトル（必須）"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="例: オールナイトニッポン"
          required
        />

        <Input
          id="podcast-author"
          label="配信者名"
          value={form.author ?? ""}
          onChange={(e) => updateField("author", e.target.value)}
          placeholder="例: ニッポン放送"
        />

        <div className="w-full">
          <label htmlFor="podcast-description" className="block text-sm font-medium text-stone-700 mb-1">
            説明文
          </label>
          <textarea
            id="podcast-description"
            value={form.description ?? ""}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="番組の説明文"
            rows={3}
            className="block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>

        <Input
          id="podcast-artwork-url"
          label="アートワーク URL"
          type="url"
          value={form.artwork_url ?? ""}
          onChange={(e) => updateField("artwork_url", e.target.value)}
          placeholder="https://example.com/artwork.jpg"
        />

        <Input
          id="podcast-genre"
          label="ジャンル"
          value={form.genre ?? ""}
          onChange={(e) => updateField("genre", e.target.value)}
          placeholder="例: コメディ"
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" loading={isPending} className="w-full">
          番組を登録
        </Button>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  エピソード登録フォーム                                                */
/* ------------------------------------------------------------------ */

function EpisodeForm() {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [podcastId, setPodcastId] = useState("");
  const [form, setForm] = useState<CreateEpisodeInput>({
    title: "",
    description: "",
    published_at: "",
  });

  const updateField = (field: keyof CreateEpisodeInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = adminCreateEpisodeSchema.safeParse({
      podcast_id: podcastId.trim(),
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      published_at: form.published_at?.trim() || undefined,
    });

    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      try {
        const payload: CreateEpisodeInput = { title: validation.data.title };
        if (validation.data.description) payload.description = validation.data.description;
        if (validation.data.published_at) {
          // date input の値（YYYY-MM-DD）を RFC3339 形式に変換
          payload.published_at = new Date(validation.data.published_at).toISOString();
        }

        const result = await adminCreateEpisode(validation.data.podcast_id, payload);
        showToast(`エピソード「${result.title}」を登録しました`);
        setForm({ title: "", description: "", published_at: "" });
      } catch (err) {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError("登録に失敗しました");
        }
      }
    });
  };

  return (
    <Card padding="lg">
      <h2 className="text-xl font-semibold text-stone-900 mb-4">エピソードの手動登録</h2>
      <p className="text-sm text-stone-500 mb-6">
        指定した番組にエピソードを手動で追加します。
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="episode-podcast-id"
          label="番組 ID（UUID）（必須）"
          value={podcastId}
          onChange={(e) => setPodcastId(e.target.value)}
          placeholder="例: 550e8400-e29b-41d4-a716-446655440000"
          required
        />

        <Input
          id="episode-title"
          label="タイトル（必須）"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="例: 第100回"
          required
        />

        <div className="w-full">
          <label htmlFor="episode-description" className="block text-sm font-medium text-stone-700 mb-1">
            説明文
          </label>
          <textarea
            id="episode-description"
            value={form.description ?? ""}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="エピソードの説明文"
            rows={3}
            className="block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>

        <Input
          id="episode-published-at"
          label="公開日"
          type="date"
          value={form.published_at ?? ""}
          onChange={(e) => updateField("published_at", e.target.value)}
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" loading={isPending} className="w-full">
          エピソードを登録
        </Button>
      </form>
    </Card>
  );
}
