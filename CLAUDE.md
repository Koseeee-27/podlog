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

### データベース・ホスティング
- **DB**: PostgreSQL
- **BaaS**: Supabase（初期ホスティング）

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

### フロントエンド (TypeScript / Next.js)
- `any` 型の使用禁止。型が不明な場合は `unknown` を使う
- コンポーネントは **関数コンポーネント** のみ使用
- 新しいコンポーネントには必ず **Storybook** のストーリーを追加
- ビジネスロジックは **カスタムフック** に切り出す
- 重要な関数には **Jest** でユニットテストを書く

### バックエンド (Go)
- **レイヤードアーキテクチャ**を採用: handler → usecase → repository
- エラーハンドリングは必ず行う（`if err != nil` を省略しない）
- APIを追加・変更したら **Swagger コメント** を更新する（`swag generate` を忘れずに）
- テーブルを追加・変更したら **DB 仕様書** (`backend/docs/database.md`) を更新する
- Go初学者のため、Claude は Go の書き方を丁寧に説明すること

### API設計
- RESTful API 原則に従う
- レスポンス形式は JSON で統一
- エラーレスポンスは `{ "error": "message" }` 形式

## Claude へのお願い

- **Go は初学者**なので、Goのコードを書くときは何をしているか説明を加えること
- 新機能を実装する前に、まず設計・アーキテクチャを提案してから実装に入ること
- テストを忘れずに書くよう促すこと
- セキュリティ上の問題（SQL injection, XSS など）を見つけたら必ず指摘すること
