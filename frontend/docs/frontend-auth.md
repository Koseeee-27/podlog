# フロントエンド認証設計

PodLog フロントエンドの認証アーキテクチャを解説する。3 層 API クライアント構造と DAL (Data Access Layer) パターンに基づき、認証ロジックをアプリ全体で統一的に扱う。

## 全体像

```
┌──────────────────────────────────────────────────────────┐
│  ブラウザ (Client Component)                              │
│    - props で認証状態を受け取る                            │
│    - signOut() でログアウト                                │
│    - Client API (lib/api/*.ts) で追加データ取得            │
└────────────────┬─────────────────────────────────────────┘
                 │ リクエスト
┌────────────────▼─────────────────────────────────────────┐
│  Proxy (旧 Middleware) — middleware.ts                     │
│    - Cookie のトークンリフレッシュ                         │
│    - 保護パスへの未認証アクセスを /login にリダイレクト     │
│    - getUser() による JWT 検証 (保護パスのみ)              │
└────────────────┬─────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│  Server Component (page.tsx / layout.tsx)                  │
│    - DAL 関数でデータ取得                                 │
│    - getViewer() で認証状態を判定し、表示を出し分け        │
│    - Server Action で mutation (POST/PUT/DELETE)           │
└────────────────┬─────────────────────────────────────────┘
                 │ DAL / apiFetch
┌────────────────▼─────────────────────────────────────────┐
│  3 層 API クライアント構造                                 │
│                                                           │
│  [上位] lib/data/*.ts        (DAL)                        │
│    └─ getAuthHeaders() で認証ヘッダー取得                  │
│       └─ apiFetch() で Go バックエンドにリクエスト         │
│                                                           │
│  [中位] lib/auth/getAuthHeaders.ts + getViewer.ts         │
│    └─ Supabase Cookie → Bearer トークン                   │
│    └─ /users/me で Viewer 判別 union を返す                │
│                                                           │
│  [下位] lib/api/fetch.ts     (apiFetch)                   │
│    └─ 純粋な HTTP クライアント (リトライ・エラー変換)       │
└──────────────────────────────────────────────────────────┘
```

## 2 つのユーザー概念

PodLog には異なる 2 つのユーザー概念がある。

| 概念 | 管理元 | 説明 |
|---|---|---|
| **Supabase Auth ユーザー** | Supabase | Google OAuth で認証されたユーザー。JWT に `sub` (ユーザー ID) が含まれる |
| **PodLog DB プロフィール** | Go バックエンド | ユーザー名・表示名・自己紹介など。初回ログイン後に `/profile/setup` で作成する |

`getViewer()` はこの 2 つを組み合わせて、以下の 3 状態を判別 union で返す:

```ts
type Viewer =
  | { status: "guest" }          // 未ログイン
  | { status: "no_profile" }     // ログイン済みだがプロフィール未作成
  | { status: "authenticated"; profile: User }; // ログイン + プロフィール有り
```

## 3 層の責務

### Proxy (旧 Middleware) — `middleware.ts`

> Next.js 16 で `middleware.ts` は `proxy.ts` にリネームされた。PodLog ではまだ `middleware.ts` を使用しているが、将来のバージョンで移行する。

- 全リクエストで Cookie ベースのトークンリフレッシュを行う
- **保護パス** (`/record`, `/profile/setup`, `/settings`, `/admin`) への未認証アクセスを `/login` にリダイレクト
- 保護パスでのみ `getUser()` を実行して JWT を検証する
- 公開ページでは Cookie があれば `getSession()` でリフレッシュのみ（`getUser()` は呼ばない）
- 認証済みユーザーの `/login` アクセスを `/` にリダイレクト

### Server Component

- **DAL 関数**（`lib/data/*.ts`）でデータを取得する
- **`getViewer()`** で認証状態を判定し、表示の出し分けや props への受け渡しを行う
- `page.tsx` / `layout.tsx` は Server Component に保ち、`"use client"` を付けない
- Supabase クライアントを `page.tsx` から直接呼ばない（DAL / `getViewer()` に集約）

### Client Component

- **認証状態は props で受け取る**。Client Component から `getViewer()` を import しない
- ログアウトは `lib/auth/signOut.ts` の `signOut()` を使う
- 追加データ取得（ページネーション等）はクライアント API（`lib/api/*.ts`）で直接行う

## 3 層 API クライアント構造

### 下位: `lib/api/fetch.ts` — `apiFetch()`

Go バックエンドへの HTTP リクエストを発行する純粋な HTTP クライアント。

```ts
// lib/api/fetch.ts
export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T>
```

- `import "server-only"` で Client Component からの import を防止
- GET のみネットワークエラー / 5xx で 1 回リトライ（Neon コールドスタート対策）
- 2xx 以外は `ApiRequestError` を throw（`status` と `message` を保持）
- 204 No Content は `undefined` を返す
- **認証ヘッダーの構築は責務外**。呼び出し側で `getAuthHeaders()` 等を使って組み立てる

### 中位: 認証ヘルパー

#### `lib/auth/getAuthHeaders.ts`

```ts
// lib/auth/getAuthHeaders.ts
export const getAuthHeaders = cache(
  async (): Promise<Record<string, string>>
);
```

- Supabase SSR の Cookie から JWT を取り出し、`{ Authorization: "Bearer ..." }` を返す
- 未ログインなら空オブジェクト `{}` を返す
- Cookie に `sb-` prefix がなければ Supabase クライアント生成自体をスキップ（最速パス）
- `getSession()` を使って JWT を取得する（改ざん検知はバックエンドの JWKS 検証に委ねる）
- React `cache()` でリクエストスコープメモ化

#### `lib/auth/getViewer.ts`

```ts
// lib/auth/getViewer.ts
export const getViewer = cache(async (): Promise<Viewer>);
```

- `getAuthHeaders()` → `apiFetch<User>("/users/me")` の **1 段階構造**
- `Authorization` が空なら即 `{ status: "guest" }` を返す
- 401 → `guest`、404 → `no_profile`、200 → `authenticated`
- 500 番台は throw して呼び出し側に委ねる
- React `cache()` でメモ化。Server Component ツリー内で何度呼んでもバックエンドへのリクエストは 1 回

### 上位: `lib/data/*.ts` — DAL (Data Access Layer)

Server Component から呼ぶデータ取得関数を集約する。

```
lib/data/
├── me.ts               # 自分のプロフィール・聴取記録（認証必須）
├── users.ts             # 他ユーザーの公開プロフィール（公開）
├── podcasts.ts          # 番組検索・詳細（公開 / オプショナル認証）
├── episodes.ts          # エピソード詳細（公開 / オプショナル認証）
├── reviews.ts           # レビュー取得・作成・更新・削除
├── podcast-requests.ts  # 番組追加リクエスト（認証必須）
├── timeline.ts          # タイムライン（公開）
└── genres.ts            # ジャンル一覧（公開）
```

DAL 関数の共通ルール:

- `import "server-only"` で Client Component からの import を防止
- React `cache()` でラップし、同一リクエスト内の重複取得を防ぐ
- エンドポイント URL とキャッシュ戦略を DAL 側に閉じ込める

## DAL 関数の実装パターン

認証の有無に応じて 3 パターンに分かれる。

### パターン 1: 公開 API

認証不要。`next: { revalidate }` でキャッシュを効かせる。

```ts
// lib/data/podcasts.ts
export const getPodcastById = cache(
  async (id: string): Promise<PodcastDetailResult> => {
    return apiFetch<PodcastDetailResult>(
      `/podcasts/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60 },
      },
    );
  },
);
```

### パターン 2: オプショナル認証

未ログインでも動作するが、ログイン中はユーザー固有のデータ（聴取済みフラグ等）が付く。

**キャッシュ戦略の注意点:**
- `Authorization` ヘッダーあり → `cache: "no-store"` を明示
- `Authorization` ヘッダーなし → `next: { revalidate }` でキャッシュ可
- **両者の同時指定は禁止**（別ユーザーのレスポンスが混入するリスクがある）

```ts
// lib/data/podcasts.ts
export const getPodcastEpisodes = cache(
  async (id: string, limit?: number, offset?: number): Promise<EpisodeListResult> => {
    const authHeaders = await getAuthHeaders();
    const hasAuth = "Authorization" in authHeaders;

    const search = new URLSearchParams();
    if (limit !== undefined) search.set("limit", String(limit));
    if (offset !== undefined) search.set("offset", String(offset));
    const query = search.toString() ? `?${search.toString()}` : "";

    return apiFetch<EpisodeListResult>(
      `/podcasts/${encodeURIComponent(id)}/episodes${query}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        // Authorization 付きは no-store、なければ revalidate
        ...(hasAuth
          ? { cache: "no-store" as const }
          : { next: { revalidate: 60 } }),
      },
    );
  },
);
```

### パターン 3: 認証必須

`getAuthHeaders()` で認証ヘッダーを取得し、`cache: "no-store"` を明示する。**DAL 側では 401 を事前判定しない**。呼び出し側（`page.tsx` や Server Action）で `ApiRequestError` を catch して処理する。

```ts
// lib/data/me.ts
export const getMyProfile = cache(async (): Promise<User> => {
  const authHeaders = await getAuthHeaders();
  return apiFetch<User>("/users/me", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    cache: "no-store",
  });
});
```

### 命名規則

| 層 | 命名パターン | 例 |
|---|---|---|
| DAL（Server Component 用） | `getXxx` | `getMyProfile`, `getPodcastById` |
| クライアント API（Client Component 用） | `fetchXxx` | `fetchUserListeningRecords` |
| mutation（POST/PUT/DELETE） | `createXxx` / `updateXxx` / `deleteXxx` | `createReview`, `deleteMyReview` |

**DAL とクライアント API で同名の関数を作らない。** 同名にすると import 切替時に取り違えが起き、シグネチャが異なる場合に静かに壊れる。

## `getViewer()` の使い分け

### 公開ページ — UI 出し分け

リダイレクトせず、認証状態に応じて UI を切り替える。

```tsx
// app/(main)/discover/page.tsx
import { getViewer } from "@/lib/auth/getViewer";

export default async function DiscoverPage() {
  const viewer = await getViewer();
  const isLoggedIn = viewer.status === "authenticated";

  return (
    <>
      <SearchResults />
      {/* ログイン状態を props で渡す */}
      <PodcastRequestPrompt isLoggedIn={isLoggedIn} />
    </>
  );
}
```

### 保護ページ — パターン A: 成功時に画面を描画

`/settings`, `/record`, `/admin` 等。`getMyProfile()` の catch で 401/403/404 をハンドリングする。

```tsx
// app/(main)/settings/page.tsx
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/me";
import { ApiRequestError } from "@/types/api";
import type { User } from "@/types/user";

export default async function SettingsPage() {
  let profile: User;
  try {
    profile = await getMyProfile();
  } catch (err) {
    if (err instanceof ApiRequestError) {
      if (err.status === 401 || err.status === 403) {
        redirect("/login");
      }
      if (err.status === 404) {
        redirect("/profile/setup");
      }
    }
    throw err;
  }

  return <SettingsClient profile={profile} />;
}
```

### 保護ページ — パターン B: 成功時にリダイレクト (`/profile/setup`)

プロフィール設定済みなら `/` に戻す。未設定 (404) のときだけ画面を描画する逆パターン。

```tsx
// app/(main)/profile/setup/page.tsx
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/me";
import { ApiRequestError } from "@/types/api";

export default async function ProfileSetupPage() {
  try {
    await getMyProfile();
  } catch (err) {
    if (err instanceof ApiRequestError) {
      if (err.status === 401 || err.status === 403) {
        redirect("/login");
      }
      if (err.status === 404) {
        return <ProfileSetupClient />;
      }
    }
    throw err;
  }

  redirect("/");
}
```

### 保護ページ共通のポイント

- **`try` の中で `redirect()` を呼ばない**: `redirect()` は内部で `NEXT_REDIRECT` を throw するため、catch に巻き込まれる
- **401 と 403 を両方** `/login` にリダイレクトする
- **catch 末尾の `throw err` は 1 回だけ**: 500 等の予期しないエラーは Next.js エラーページに委ねる
- **`page.tsx` 冒頭で `supabase.auth.getUser()` を呼ばない**: middleware で認証チェック済みのため不要。`cache()` の重複排除も効かなくなる

### `layout.tsx` — guest フォールバック

`layout.tsx` で `getViewer()` が throw すると配下の全ページが `error.tsx` に飛ぶ。公開ページのコンテンツまで巻き込まれるため、catch して `guest` にフォールバックする。

```tsx
// app/(main)/layout.tsx
import { getViewer, type Viewer } from "@/lib/auth/getViewer";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let viewer: Viewer;
  try {
    viewer = await getViewer();
  } catch (err) {
    console.error("[MainLayout] getViewer failed, falling back to guest:", err);
    viewer = { status: "guest" };
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar viewer={viewer} />
      <main>{children}</main>
    </div>
  );
}
```

保護ページの認証チェックは各 `page.tsx` の `getMyProfile()` catch が担保する。レイアウトで guest にフォールバックしても、保護ページ側で 401 が発生して `/login` にリダイレクトされる。

## Server Action と DAL の責務分担

Server Action は mutation 専用。データ取得（GET 相当）には使わない。

### 責務の分担

| 責務 | Server Action (`lib/actions/*.ts`) | DAL (`lib/data/*.ts`) |
|---|---|---|
| `"use server"` ディレクティブ | 必須 | 不要 |
| FormData パース | 担当する | 担当しない |
| Zod バリデーション | 担当する | 担当しない |
| 認証・認可チェック | `getViewer()` で判定 | 事前判定しない |
| URL 組み立て | 担当しない | 担当する |
| 認証ヘッダー取得 | 担当しない | `getAuthHeaders()` |
| `apiFetch` 呼び出し | 担当しない | 担当する |
| `revalidatePath` / `revalidateTag` | 担当する | 担当しない |
| エラーをフォームに返す | `{ success, error }` | throw する |

### HTTP メソッドのセマンティクス

- ブラウザ → Next.js (Server Action): 常に **POST**
- Next.js → Go バックエンド (DAL): **PUT** / **DELETE** / **POST** をセマンティクスに合わせて使う

### コード例: レビュー投稿

```ts
// lib/actions/review.ts — Server Action 側
"use server";

import { createReview } from "@/lib/data/reviews";
import { getViewer, type Viewer } from "@/lib/auth/getViewer";

export async function createReviewAction(
  episodeId: string,
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  // 1. 入力バリデーション（信頼できない外部入力を早期に弾く）
  if (!uuidSchema.safeParse(episodeId).success) {
    return { success: false, error: "無効なエピソードIDです" };
  }

  // 2. 認証チェック
  let viewer: Viewer;
  try {
    viewer = await getViewer();
  } catch {
    return { success: false, error: "認証情報の取得に失敗しました" };
  }
  if (viewer.status === "guest") {
    return { success: false, error: "ログインが必要です" };
  }
  if (viewer.status !== "authenticated") {
    return { success: false, error: "プロフィール設定が必要です" };
  }

  // 3. スキーマバリデーション
  const result = createReviewRequestSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  // 4. DAL 呼び出し (mutation)
  try {
    const review = await createReview(episodeId, result.data);
    return { success: true, review };
  } catch (err) {
    return {
      success: false,
      error: getUserFriendlyErrorMessage(err, "レビューの投稿に失敗しました"),
    };
  }
}
```

```ts
// lib/data/reviews.ts — DAL 側
export async function createReview(
  episodeId: string,
  data: CreateReviewRequest,
): Promise<Review> {
  const authHeaders = await getAuthHeaders();
  return apiFetch<Review>(
    `/episodes/${encodeURIComponent(episodeId)}/reviews`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(data),
    },
  );
}
```

### `"use server"` の自動公開リスクと認可チェック

Server Action は `"use server"` を宣言した時点で**パブリック HTTP エンドポイントとして公開される**。UI にボタンを表示していなくても、直接 POST リクエストを送って呼び出せる。そのため:

- **一般ユーザー向け**: `viewer.status === "authenticated"` の検証を必ず行う
- **管理者向け**: `viewer.profile.is_admin` の追加検証を行う
- 認証チェックを省略した Server Action は作らない

## Client Component の設計

### 認証状態は props で受け取る

Client Component から `getViewer()` を import しない（`import "server-only"` でブロックされる）。認証状態は Server Component で解決して props で渡す。

```tsx
// Server Component (page.tsx)
const viewer = await getViewer();
const isLoggedIn = viewer.status === "authenticated";
return <PodcastRequestPrompt isLoggedIn={isLoggedIn} />;

// Client Component
interface Props { isLoggedIn: boolean; }
export default function PodcastRequestPrompt({ isLoggedIn }: Props) {
  // isLoggedIn を使って UI を出し分ける
}
```

### ログアウトは `signOut()` を使う

```ts
// lib/auth/signOut.ts
export async function signOut(router: AppRouter): Promise<void>;
```

各コンポーネントで `createBrowserClient().auth.signOut()` + `router.push("/login")` を書くのではなく、`signOut()` に集約する。将来 Sentry 通知や Analytics イベントを追加する際に 1 箇所の修正で済む。

```tsx
"use client";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/signOut";

function LogoutButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => signOut(router)}>
      ログアウト
    </button>
  );
}
```

## `useOptimistic` との組み合わせ（将来の実装候補）

聴取済みトグルやお気に入り追加など、即時 UI 反映が求められる操作では `useOptimistic` を使う。

```tsx
"use client";
import { useOptimistic, useTransition } from "react";

function ListenToggle({
  episodeId,
  initialListened,
}: {
  episodeId: string;
  initialListened: boolean;
}) {
  const [optimisticListened, setOptimisticListened] = useOptimistic(initialListened);
  const [isPending, startTransition] = useTransition();

  async function handleToggle() {
    startTransition(async () => {
      setOptimisticListened(!optimisticListened);
      // Server Action で実際の更新を行う
      await toggleListenAction(episodeId);
    });
  }

  return (
    <button type="button" onClick={handleToggle} disabled={isPending}>
      {optimisticListened ? "聴取済み" : "未聴取"}
    </button>
  );
}
```

ポイント:
- `useOptimistic` で即座に UI を反映し、Server Action の完了を待たない
- `useTransition` の `isPending` で連打防止
- Server Action が失敗した場合、自動的に元の値にロールバックされる

## 禁止事項

### `apiFetch` を `page.tsx` / Server Component から直接呼ばない

`apiFetch` は DAL 関数内から呼ぶ。`page.tsx` から直接呼ぶと、エンドポイント URL やキャッシュ戦略が散在する。

```ts
// ❌ Don't: page.tsx で直接呼ぶ
const podcasts = await apiFetch("/podcasts/popular");

// ✅ Do: DAL 経由で呼ぶ
const podcasts = await getPopularPodcasts();
```

### `serverGet` / `serverPost` 系関数の利用禁止

旧 API クライアント（`serverGet`, `serverPost` 等）は削除済み。新規コードでこれらのパターンを復活させない。

### `useAuth` フックの利用禁止

旧 `useAuth` フックは削除済み。Client Component での認証状態の取得は props 経由で行う。

### `"use client"` 配下から `getViewer()` を import しない

`getViewer()` は `import "server-only"` で保護されている。Client Component から import するとビルドエラーになる。

### Server Action 内で認証・認可チェックを省略しない

`"use server"` を宣言した関数はパブリック HTTP エンドポイントとして公開される。UI の有無に関係なく、認証チェックは必須。

### オプショナル認証ルートで `Authorization` + `revalidate` を併用しない

`Authorization` ヘッダー付きの fetch を `next: { revalidate }` でキャッシュすると、別ユーザーのレスポンスが同一キーで混入するリスクがある。

```ts
// ❌ Don't: Authorization 付きで revalidate
headers: { Authorization: `Bearer ${token}` },
next: { revalidate: 60 }

// ✅ Do: Authorization 付きは no-store
headers: { Authorization: `Bearer ${token}` },
cache: "no-store"

// ✅ Do: 認証なしなら revalidate OK
headers: { "Content-Type": "application/json" },
next: { revalidate: 60 }
```

## 参考文献

- [Next.js 公式ブログ "How to Think About Security in Next.js"](https://nextjs.org/blog/security-nextjs-server-components-actions) — Sebastian Markbåge による Server Component / Server Action のセキュリティモデル解説。DAL パターンの原典
- [React 公式 `cache()` API ドキュメント](https://react.dev/reference/react/cache) — リクエストスコープのメモ化。`getViewer()` や DAL 関数で使用
- [Next.js 公式 `server-only` パッケージ](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment) — Server Component 専用モジュールの保護
- [Next.js App Router データフェッチング](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching) — Server Component でのデータ取得ベストプラクティス
- [Next.js 16 — proxy.ts (formerly middleware.ts)](https://nextjs.org/blog/next-16#proxyts-formerly-middlewarets) — `middleware.ts` → `proxy.ts` のリネーム
