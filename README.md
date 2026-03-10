# PodLog

ポッドキャストの聴取記録・レビューアプリ（Filmarks のラジオ版）

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) / TypeScript |
| バックエンド | Go / Echo |
| データベース | PostgreSQL 17 |
| 認証 | Supabase Auth |
| インフラ | Docker / Docker Compose |
| CI | GitHub Actions |

## セットアップ

```bash
# 1. 環境変数を設定
cp .env.example .env
# .env を編集して SUPABASE_URL を設定

# 2. Docker Compose で起動（API + DB）
cd backend && make up

# 3. フロントエンドを起動（別ターミナル）
cd frontend && npm install && npm run dev
```

## アクセス

| サービス | URL |
|---|---|
| フロントエンド | http://localhost:3000 |
| API サーバー | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger/index.html |

## MVP 機能（現在の実装範囲）

- ポッドキャスト登録（RSS フィード URL）
- エピソード一覧取得
- 聴取記録の作成・一覧
- レビュー（星評価 + テキスト）の投稿・一覧
- タイムライン表示

## ディレクトリ構成

```
podlog/
├── frontend/          # Next.js アプリ
├── backend/           # Go API サーバー
├── docker-compose.yml
└── .github/workflows/ # CI
```
