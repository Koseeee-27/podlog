# Makefile - よく使うコマンドをまとめたファイル
# `make run` のように短いコマンドで実行できます

.PHONY: run build test lint swagger clean

# ローカルでサーバーを起動（Docker不使用）
run:
	go run ./cmd/server

# バイナリをビルド
build:
	CGO_ENABLED=0 go build -o bin/server ./cmd/server

# 全テストを実行（-v で詳細表示、-count=1 でキャッシュ無効化）
test:
	go test -v -count=1 ./...

# テストをカバレッジ付きで実行
test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Swagger ドキュメントを生成
swagger:
	swag init -g cmd/server/main.go -o docs

# go vet で静的解析
lint:
	go vet ./...

# ビルド成果物を削除
clean:
	rm -rf bin/ coverage.out coverage.html

# Docker Compose で起動
up:
	docker-compose -f ../docker-compose.yml up --build

# Docker Compose で停止
down:
	docker-compose -f ../docker-compose.yml down
