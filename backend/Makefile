# Makefile - よく使うコマンドをまとめたファイル
# `make run` のように短いコマンドで実行できます

.PHONY: run build test lint swagger clean migrate-up migrate-down

# ローカルでサーバーを起動（Docker不使用）
run:
	go run ./cmd/server

# マイグレーション: 未適用のマイグレーションを全て適用する
# サーバー起動時（cmd/server）にも自動で同じ Up が走るが、
# Down 検証や CI/CD で明示的に流したいときに使う
migrate-up:
	go run ./cmd/migrate up

# マイグレーション: 直近 1 ステップだけロールバックする
# 連続して巻き戻したい場合は本コマンドを複数回叩く（誤操作で全消し事故を防ぐため）
migrate-down:
	go run ./cmd/migrate down

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
