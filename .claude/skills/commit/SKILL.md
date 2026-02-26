---
name: commit
description: Conventional Commits 形式でコミットを作成する
disable-model-invocation: true
---

Conventional Commits 形式でコミットを作成してください。

手順:
1. `git status` と `git diff --staged` で変更内容を確認する
2. 変更内容に合ったコミットタイプを選ぶ:
   - `feat:` 新機能
   - `fix:` バグ修正
   - `docs:` ドキュメントのみの変更
   - `style:` コードの意味に影響しない変更（フォーマット等）
   - `refactor:` バグ修正でも機能追加でもないコード変更
   - `test:` テストの追加・修正
   - `chore:` ビルドプロセスや補助ツールの変更
3. 日本語または英語でコミットメッセージを作成する
4. `git commit -m "..."` を実行する

ステージされていないファイルがある場合は、何をステージするか確認してから進めること。
