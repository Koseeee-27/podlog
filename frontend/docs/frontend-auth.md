# フロントエンド認証状態管理方針

## 採用パターン: Server Component ベース認証

認証情報の取得は **Server Component** に一本化し、Client Component は props で受け取るだけにする。`useEffect` + `getUser` / `onAuthStateChange` による Client Component でのリアルタイム反映は廃止する。

```text
Middleware        → 門番（保護ルートの検証）+ セッションリフレッシュ
Server Component  → getViewer() で認証情報を取得（表示の出し分け）
Client Component  → props で viewer / profile / isLoggedIn を受け取るだけ
```

この方針により、以下を同時に達成する。

- **セキュリティ**: 認可判断をサーバーサイドに集約する（JWT 改ざん対策）
- **パフォーマンス**: 公開ページは Supabase Auth への通信を極力避ける（最速パス）
- **一貫性**: `cache()` により、Server Component 内での `getViewer()` の重複呼び出しを 1 回に集約する（ただし Middleware での `getUser()` は別レイヤーなので別途発生する）
- **シンプルさ**: チラつきなしで初回レンダリング時に認証状態が確定する

## 2 つのユーザー概念

PodLog は「Supabase Auth の認証ユーザー」と「PodLog DB のユーザープロフィール」という 2 つのユーザー概念を持つ。認証が通っていても、プロフィール（`users` テーブルの行）がまだ作成されていないケース（= `no_profile`）が存在する。

| 状態 | 認証 | プロフィール | ステータスコード（`/users/me`） |
|---|---|---|---|
| `guest` | ❌ 未ログイン | ― | 401 |
| `no_profile` | ✅ ログイン済み | ❌ 未作成 | 404 |
| `authenticated` | ✅ ログイン済み | ✅ 作成済み | 200 |

保護ページでは、`guest` → `/login`、`no_profile` → `/profile/setup`、`authenticated` → そのまま表示、の 3 分岐が必要になる。

## 各レイヤーの責務

### Middleware（`src/middleware.ts`）

**役割**: 門番とセッションリフレッシュ。認証情報の取得・引き回しは行わない。

> ℹ️ **Next.js 16 移行メモ**: Next.js 16 では `middleware.ts` は非推奨となり `proxy.ts` への移行が推奨されている。本ドキュメントは現行の `middleware.ts` を前提に記述する。`proxy.ts` への移行は別 Issue で扱う。

Middleware では最初に `/signup` → `/login` のリダイレクト（Google 認証のみに統合しているため）を行う。その後、以下の 3 つの最適化パスで動作する（詳細は `src/lib/supabase/middleware.ts` を参照）。

| パターン | 条件 | 挙動 |
|---|---|---|
| 最速パス | 公開ページ + Cookie なし | Supabase クライアント生成すらスキップ。単に `NextResponse.next()` を返す |
| リフレッシュパス | 公開ページ + Cookie あり | `getSession()` のみ呼ぶ。通常は Cookie のローカルデコードで完結するが、**トークン期限切れ時のみ Supabase Auth へのリフレッシュ通信が発生する** |
| 保護パス | 保護ルート（`/record`, `/profile/setup`, `/settings`, `/admin`） | `getUser()` で JWT を検証。未認証なら `/login` へリダイレクト |

保護ルートの定義は `PROTECTED_PATHS` で一元管理する。

加えて、認証済みユーザーが `/login` にアクセスした場合は、最終確認として `getUser()` を呼び、検証が通れば `/` にリダイレクトする（頻度が低いのでコスト許容）。

### Server Component

**役割**: 認証情報の取得窓口。ページ単位で `getViewer()` を呼ぶ。

- `lib/auth/getViewer.ts` の `getViewer()` を経由して認証情報を取得する
- `page.tsx` や `layout.tsx` で直接 `supabase.auth.getUser()` を書かない
- `serverGet<User>("/users/me")` と `getUser()` を別々に呼ぶコードも書かない（`getViewer()` が両方を担う）
- 認証情報を必要とする Client Component には、props で `viewer` / `profile` / `isLoggedIn` などを渡す

### Client Component

**役割**: UI の操作のみ。認証情報は props で受け取る。

- 認証情報は **すべて props 経由** で受け取る
- `useAuth` フックを使わない（廃止予定）
- `useEffect` + `supabase.auth.getUser()` で取得しない
- `onAuthStateChange` の subscribe も行わない（別タブ同期が絶対必要な画面が出てきた場合のみ、個別に許可）
- ログアウトは `supabase.auth.signOut()` を直接呼ぶ。**`await signOut()` の完了後に** `router.refresh()` を呼び、Cookie 削除が反映された状態で Server Component を再評価させる（順序を逆にすると古い Cookie で再評価されてしまう）
- プロフィール更新後の再取得は `router.refresh()` で行う（`refreshProfile()` のような Client 側関数は不要）

## `getViewer()` ヘルパーの設計

### インターフェース

判別 union で 3 つの状態を返す。呼び出し側は `switch (viewer.status)` で網羅的に分岐できる。

> ※ 以下のコード例は設計上の仕様を示すもので、具体的な実装時にファイルパスやインポートは調整してよい。

```ts
// src/lib/auth/getViewer.ts
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import type { User as AppUser } from "@/types/user";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type Viewer =
  | { status: "guest" }
  | { status: "no_profile"; authUser: SupabaseUser }
  | { status: "authenticated"; authUser: SupabaseUser; profile: AppUser };

/**
 * 同一リクエスト内で何度呼んでも Supabase / バックエンドへの通信は 1 回だけ。
 * React の cache() により自動的にメモ化される。
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  // Cookie が無ければ Supabase クライアントを作らずに guest を返す（最速パス）
  // 注: sb- プレフィックスの Cookie は PKCE 進行中の code_verifier 等も含むため
  // 厳密な認証判定にはならないが、「1 つも無い」なら未ログイン確定として扱える
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (!hasAuthCookie) return { status: "guest" };

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { status: "guest" };

  try {
    const profile = await serverGet<AppUser>("/users/me");
    return { status: "authenticated", authUser, profile };
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { status: "no_profile", authUser };
    }
    // 401 はセッション期限切れ扱いで guest に落とす
    // 保護ページでは Middleware 通過後にトークン失効した稀ケースが該当し、
    // 呼び出し側の redirect("/login") で吸収する
    if (err instanceof ApiRequestError && err.status === 401) {
      return { status: "guest" };
    }
    throw err;
  }
});
```

### 使い分けのポイント

- **`cache()` によるリクエストスコープのメモ化**: 同じリクエスト内で `layout.tsx` と `page.tsx` の両方から `getViewer()` を呼んでも、Supabase Auth / バックエンドへの通信は 1 回だけに抑えられる
- **Cookie なしの最速パス**: 認証 Cookie が存在しない場合は `createClient()` すら呼ばず `guest` を返す。公開ページを未ログインで閲覧する大多数のアクセスで、Supabase 関連の処理を完全に飛ばせる
- **401 と 404 の区別**: バックエンドが 401 を返したら `guest`、404 を返したら `no_profile` として扱う

## 公開ページ / 保護ページの確認手順

### 公開ページ

ログイン状態によって UI を出し分けるが、未ログインでも閲覧できるページ（トップ、番組詳細など）。

```tsx
// 例: src/app/(main)/page.tsx
export default async function HomePage() {
  const viewer = await getViewer();
  const isLoggedIn = viewer.status === "authenticated";

  return (
    <>
      {!isLoggedIn && <WelcomeSection />}
      {isLoggedIn && <RecentListeningSection viewer={viewer} />}
    </>
  );
}
```

- `guest` / `no_profile` / `authenticated` のどれでも閲覧可能
- 認証依存データは Suspense で分離し、メインコンテンツの描画をブロックしない
- `no_profile` の場合にプロフィール作成を促すバナーを出すかは、各画面で判断する

### 保護ページ

ログイン必須のページ（`/record`, `/settings`, `/profile/setup` などの保護ルート）。

```tsx
// 例: src/app/(main)/settings/page.tsx
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (viewer.status === "guest") redirect("/login");
  if (viewer.status === "no_profile") redirect("/profile/setup");

  return <SettingsClient profile={viewer.profile} />;
}
```

- Middleware が `guest` を既に弾くため、実務上は `no_profile` の分岐が主な出番
- ただし **`guest` 分岐は防御的に必ず書く**。Middleware 通過後にトークン失効するレースケース（Cookie 期限切れ直後など）で `guest` が返ってくる可能性があるため
- Middleware 通過後のフォローアップとして `redirect()` を明示的に書くことで、TypeScript 的にも以降 `viewer.status === "authenticated"` が保証される

## 禁止事項

以下のパターンは原則禁止する。新規実装では採用しない。

- ❌ `useEffect` + `supabase.auth.getUser()` / `fetch("/users/me")` による Client Component での認証取得
- ❌ `onAuthStateChange` の subscribe（別タブ同期が業務上必須な画面が出た場合のみ、個別に検討）
- ❌ `page.tsx` で独自に `getUser()` + `serverGet("/users/me")` を書く（`getViewer()` を使う）
- ❌ `useAuth` フックの新規利用（既存の利用箇所は段階的に移行して削除する）

## 注意事項

- 認可判断（権限チェック）は必ずサーバーサイドで行う。Client Component に渡した `viewer` / `profile` はあくまで表示用
- `getViewer()` は Server Component / Server Action / Route Handler からのみ呼ぶ。Client Component からは呼べない
- `getSession()` は JWT をローカルデコードするだけで改ざん検出不可のため、認可判断には使わない。Middleware のリフレッシュパスで使うのは Cookie の更新目的のみ
- ログイン直後の UI 反映は、コールバック Route Handler（`src/app/(auth)/callback/route.ts`）側で `redirect()` すれば Server Component が新しい Cookie で再評価されるため、Client 側のリアルタイム監視は不要
