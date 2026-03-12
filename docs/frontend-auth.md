# フロントエンド認証状態管理方針

## 採用パターン: ハイブリッド方式

Server Component と Client Component の役割を分離し、それぞれの強みを活かす。

```
Middleware        → トークンリフレッシュ + ルート保護
Server Component  → getUser() で認証チェック（表示の出し分け）
Client Component  → onAuthStateChange でリアルタイム反映が必要な箇所のみ
```

## 各レイヤーの責務

### Middleware（`src/middleware.ts`）

- 全リクエストで `supabase.auth.getUser()` を実行し、トークンの有効性を検証
- 期限切れトークンのリフレッシュ（Cookie 書き込み）
- 保護ルートへの未認証アクセスをリダイレクト（`/profile/setup`, `/settings` → `/login`）
- 認証済みユーザーの認証ページアクセスをリダイレクト（`/login` → `/`）

### Server Component

- `lib/supabase/server.ts` の `createClient()` + `getUser()` でサーバーサイド認証チェック
- ページの初回レンダリング時にログイン状態を確定させる（チラつきなし）
- 認証状態による表示の出し分け（ウェルカムセクションの表示/非表示など）
- **`getSession()` ではなく `getUser()` を使う**（JWT 改ざん対策）

### Client Component

- `onAuthStateChange` によるリアルタイムな認証状態の監視
- ログイン/ログアウト後の即時 UI 反映（Navbar のアバター切り替えなど）
- **認証状態に依存しない表示は Server Component に任せる**

## 設計原則

### `"use client"` を最小限にする

- ページ全体を Client Component にしない
- 認証チェック → Server Component、インタラクション → Client Component に分離
- 静的な UI（ウェルカムセクション、見出し等）は Server Component でレンダリング

### 認証の取得方法を使い分ける

| 場所 | 方法 | 用途 |
|---|---|---|
| Middleware | `getUser()` | トークン検証・リフレッシュ・ルート保護 |
| Server Component | `getUser()` | ページレベルの表示出し分け |
| Client Component | `onAuthStateChange` | リアルタイム UI 反映 |

### Cookie ベースのセッション管理

- `@supabase/ssr` の `createServerClient` / `createBrowserClient` で Cookie を統一管理
- Server Component では Cookie の write が不可のため `setAll` の失敗を許容（try-catch）
- Middleware で先にトークンリフレッシュが行われるため、Server Component は読み取り専用で安全

## 注意事項

- `getUser()` は毎回 Supabase Auth サーバーへ HTTP リクエストを送る。Middleware + Server Component で 1 リクエストあたり 2 回呼ばれる点を認識しておく
- サーバーとクライアントで認証状態が一瞬ズレる可能性がある（ログアウト直後など）。重要な認可判断はサーバーサイドで行う
- `getSession()` は JWT をローカルデコードするだけで改ざん検出不可。認可判断には使わない
