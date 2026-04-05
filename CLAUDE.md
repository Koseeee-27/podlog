# podlog - ポッドキャスト記録アプリ

## プロジェクト概要

podlog は聴いたポッドキャストを記録・管理するWebアプリ。

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js (App Router) + TypeScript
- **テスト**: Jest + React Testing Library
- **UIカタログ**: Storybook
- **スタイル**: TBD（決まり次第追記）

### バックエンド
- **言語**: Go
- **APIドキュメント**: Swagger (swaggo/swag)
- **ルーティング**: TBD（gin / echo など）

### データベース・認証・ホスティング
- **DB**: PostgreSQL（Neon）
- **認証**: Supabase Auth
- **フロントエンドホスティング**: Netlify

### インフラ・DevOps
- **クラウド**: GCP
- **コンテナ**: Docker / Docker Compose
- **CI/CD**: GitHub Actions

## ディレクトリ構成（予定）

```
podlog/
├── frontend/          # Next.js アプリ
│   ├── src/
│   │   ├── app/       # App Router ページ
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   ├── .storybook/
│   └── jest.config.ts
├── backend/           # Go API サーバー
│   ├── cmd/
│   ├── internal/
│   │   ├── handler/
│   │   ├── usecase/
│   │   └── repository/
│   └── docs/          # Swagger 生成ドキュメント
├── docker-compose.yml
└── .github/
    └── workflows/     # CI/CD
```

## 開発規約

### 共通
- コミットメッセージは **Conventional Commits** に従う（`feat:`, `fix:`, `docs:` など）
- PR は必ずレビューを通す（個人開発でも self-review を推奨）
- **PR の粒度**: 1 PR = 1 機能 or 1 レイヤーを基本とする。レビューしやすいように変更量を小さく保つこと（例: 「聴取記録バックエンド」「聴取記録フロントエンド」のように分ける。複数機能をまとめて 1 PR にしない）

### PR 作成前チェックリスト

PR を push する前に、以下を必ずローカルで確認すること。CI と同じチェック項目であり、**CI で落ちてから直すのではなく、事前に通しておく**。

**バックエンド（変更がある場合）**
1. `go vet ./...` — 静的解析エラーがないこと
2. `go test -v -count=1 -race ./...` — テストが通ること
3. `go build ./...` — ビルドが通ること
4. `swag init -g cmd/server/main.go -o docs` — **Swagger ドキュメントを再生成してコミットに含めること**（API のハンドラーコメントを変更した場合は必須）

**フロントエンド（変更がある場合）**
1. `npm run lint` — リントエラーがないこと
2. `npx tsc --noEmit` — 型チェックが通ること
3. `npm test -- --passWithNoTests --ci` — テストが通ること
4. `npm run build` — ビルドが通ること

### フロントエンド (TypeScript / Next.js)
- `any` 型の使用禁止。型が不明な場合は `unknown` を使う
- コンポーネントは **関数コンポーネント** のみ使用
- 新しいコンポーネントには必ず **Storybook** のストーリーを追加
- ビジネスロジックは **カスタムフック** に切り出す
- 重要な関数には **Jest** でユニットテストを書く

#### React 19 / Next.js (App Router) のベストプラクティス

実装時は、使用するパターンが最新バージョンのベストプラクティスに沿っているか確認する。迷ったら古い書き方より新しい API を優先する。

- **`"use client"` の多用を避ける**: `page.tsx` / `layout.tsx` は Server Component に保ち、`"use client"` 境界は末端のインタラクティブなコンポーネントに限定する。`useState` / `useEffect` を使わないコンポーネントに `"use client"` を付けない
- **`useTransition`** を積極的に使う: 非同期アクション（追加読み込み、フォーム送信等）のローディング管理には `useTransition` の `isPending` を使い、手動の `loading` state + `useRef` による連打防止を避ける
- **`useActionState`**: フォーム送信には `useActionState` + Server Actions の利用を検討する
- **`<button>`** には必ず `type="button"` または `type="submit"` を明示する（デフォルトの `type="submit"` による意図しない送信を防ぐ）

### バックエンド (Go)
- **レイヤードアーキテクチャ**を採用: handler → usecase → repository
- エラーハンドリングは必ず行う（`if err != nil` を省略しない）
- APIを追加・変更したら **Swagger コメント** を更新する（`swag generate` を忘れずに）
- テーブルを追加・変更したら **DB 仕様書** (`backend/docs/database.md`) を更新する
- API を追加・変更したら **API 設計書** (`backend/docs/api-design.md`) も更新する
- Go初学者のため、Claude は Go の書き方を丁寧に説明すること

### API設計
- RESTful API 原則に従う
- レスポンス形式は JSON で統一
- エラーレスポンスは `{ "error": "message" }` 形式

## セキュリティ

- **シークレットファイルを読み取らない**: `.env`, `.env.local`, `.env.production`, `.env.development` などシークレットを含むファイルを絶対に読み取らないこと。`.env.example` などのテンプレートファイルは読み取り可
- `.claude/settings.json` の deny ルールで強制的にブロック済み

## Claude へのお願い

- **Go は初学者**なので、Goのコードを書くときは何をしているか説明を加えること
- 新機能を実装する前に、まず設計・アーキテクチャを提案してから実装に入ること
- テストを忘れずに書くよう促すこと
- セキュリティ上の問題（SQL injection, XSS など）を見つけたら必ず指摘すること
