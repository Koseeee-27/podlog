---
name: swagger
description: Go の Swagger ドキュメントを更新・確認する
disable-model-invocation: true
---

Go の Swagger ドキュメントを更新・確認します。

手順:
1. `backend/` ディレクトリのハンドラーファイルを確認する
2. Swagger アノテーションが正しく書かれているかチェックする
3. 不足しているアノテーションがあれば追加する
4. `swag init` コマンドを実行してドキュメントを再生成する

Swagger アノテーションの例（Go）:
```go
// @Summary     エピソード一覧取得
// @Description 登録済みのポッドキャストエピソードを全件取得する
// @Tags        episodes
// @Produce     json
// @Success     200 {array} model.Episode
// @Failure     500 {object} ErrorResponse
// @Router      /episodes [get]
```

ドキュメント生成後、`docs/` ディレクトリが更新されていることを確認すること。
