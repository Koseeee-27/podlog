"use client";

import ErrorMessage from "@/components/ui/ErrorMessage";

/**
 * Suspense の fallback 用。データ読み込み中に表示する。
 */
export function SectionSkeleton({ title }: { title: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 mb-3">{title}</h2>
      <p className="text-sm text-stone-500">読み込み中...</p>
    </section>
  );
}

/**
 * ErrorBoundary の fallback 用。API エラー時にセクション単位で表示する。
 */
export function SectionError({ title }: { title: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 mb-3">{title}</h2>
      <ErrorMessage message={`${title}の取得に失敗しました`} />
    </section>
  );
}
