interface ErrorMessageProps {
  message: string;
  /** Client Component 用: コールバックで再試行 */
  onRetry?: () => void;
  /** Server Component 用: リンクで再試行（ページリロード） */
  retryHref?: string;
  className?: string;
}

export default function ErrorMessage({ message, onRetry, retryHref, className = "" }: ErrorMessageProps) {
  return (
    <div className={`rounded-lg bg-red-50 border border-red-200 p-4 ${className}`}>
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          再試行
        </button>
      )}
      {retryHref && !onRetry && (
        <a
          href={retryHref}
          className="mt-2 inline-block text-sm text-red-600 hover:text-red-800 underline"
        >
          再読み込み
        </a>
      )}
    </div>
  );
}
