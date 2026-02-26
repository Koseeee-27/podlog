import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-bold text-indigo-600">podlog</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              ログイン
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              新規登録
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
          ポッドキャストの記録を
          <br />
          <span className="text-indigo-600">もっとシンプルに</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto">
          podlog は聴いたポッドキャストを記録・管理するためのWebアプリです。
          お気に入りの番組を検索して、エピソードを記録しましょう。
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="px-8 py-3 text-base font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            無料で始める
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            ログイン
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-left">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">ポッドキャスト検索</h3>
            <p className="mt-2 text-sm text-gray-600">
              iTunes の豊富なカタログからお気に入りの番組を検索
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-left">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">エピソード管理</h3>
            <p className="mt-2 text-sm text-gray-600">
              聴いたエピソードを記録して自分だけのライブラリを構築
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-left">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">プロフィール</h3>
            <p className="mt-2 text-sm text-gray-600">
              公開プロフィールでポッドキャスト仲間とつながろう
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-8 mt-20">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-500">
          podlog - ポッドキャスト記録アプリ
        </div>
      </footer>
    </div>
  );
}
