import Link from "next/link";

interface LoginPromptButtonProps {
  /** ボタンに表示するテキスト */
  label: string;
}

/**
 * 未ログインユーザーにログインを促すボタン。
 * /login ページへ遷移するリンクとしてレンダリングされる。
 */
export default function LoginPromptButton({ label }: LoginPromptButtonProps) {
  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
        />
      </svg>
      {label}
    </Link>
  );
}
