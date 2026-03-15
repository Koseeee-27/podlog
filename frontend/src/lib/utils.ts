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
