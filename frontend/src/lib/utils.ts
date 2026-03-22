import { ApiRequestError } from "@/types/api";

export function formatDuration(ms: number | null): string {
  if (!ms) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * 星評価を文字列で返す（★☆表記）。
 * rating を 0〜5 の整数にクランプし、範囲外や NaN でもクラッシュしない。
 */
export function formatStars(rating: number): string {
  const r = Math.max(0, Math.min(5, Math.round(rating) || 0));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

/**
 * URLが安全なプロトコル（http/https）を使用しているか検証する。
 * javascript: や data: などの危険なプロトコルを防止する。
 * 前後の空白はトリムして判定する。空文字列（トリム後）は有効として扱う（任意フィールド用）。
 */
/**
 * HTML タグを除去してプレーンテキストを返す。
 * RSS フィードの説明文などに含まれる <p>, <a> 等のタグを取り除く。
 * 段落・改行タグは改行に置換して段落構造を保持し、
 * 連続する改行を最大2つに正規化する。
 */
export function stripHtmlTags(html: string): string {
  return html
    .replace(/<\/?(p|br|div|li|tr|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/^ +| +$/gm, "")
    .trim();
}

/**
 * API エラーをユーザー向けの日本語メッセージに変換する。
 * 技術的なエラーメッセージ（"Failed to fetch" 等）がそのまま表示されるのを防ぐ。
 * @param err - キャッチしたエラー
 * @param fallback - ステータスコードが該当しない場合のデフォルトメッセージ（操作に応じて変更可能）
 */
export function getUserFriendlyErrorMessage(err: unknown, fallback = "読み込みに失敗しました"): string {
  if (err instanceof ApiRequestError) {
    switch (err.status) {
      case 401:
      case 403:
        return "ログインが必要です";
      case 404:
        return "データが見つかりませんでした";
      case 500:
        return "サーバーエラーが発生しました。しばらくしてから再試行してください";
      default:
        return fallback;
    }
  }
  // ネットワークエラー（fetch 失敗）
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    return "通信エラーが発生しました。ネットワーク接続を確認してください";
  }
  return fallback;
}

export function isValidUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === "") return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
