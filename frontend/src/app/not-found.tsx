import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-rose-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">ページが見つかりません</h1>
        <p className="mt-2 text-stone-600">お探しのページは存在しないか、移動した可能性があります。</p>
        <Link
          href="/"
          className="mt-6 inline-block px-6 py-3 text-sm font-medium bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
        >
          トップページに戻る
        </Link>
      </div>
    </div>
  );
}
