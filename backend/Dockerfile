# ============================================
# マルチステージビルド
# ステージ1 (builder): ソースコードをコンパイル
# ステージ2 (runner): コンパイル済みバイナリだけをコピーして軽量イメージを作る
# ============================================

# --- ステージ1: ビルド ---
FROM golang:1.25-alpine AS builder

WORKDIR /app

# 依存関係のファイルを先にコピーしてキャッシュを活用
# go.mod/go.sum が変わらなければ、go mod download はキャッシュされる
COPY go.mod go.sum ./
RUN go mod download

# ソースコード全体をコピー
COPY . .

# CGO_ENABLED=0: C言語ライブラリに依存しない静的バイナリを生成
# -o server: 出力ファイル名を "server" に指定
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# --- ステージ2: 実行 ---
FROM alpine:3.21

# タイムゾーンデータとCA証明書（HTTPS通信に必要）をインストール
RUN apk --no-cache add ca-certificates tzdata

# セキュリティ: 非rootユーザーを作成
# コンテナ内でroot権限で実行するとホストに影響する脆弱性のリスクが高まるため、
# 専用のユーザーで実行する
RUN addgroup -g 1000 appgroup && adduser -D -u 1000 -G appgroup appuser

WORKDIR /app

# builder ステージからバイナリだけをコピー（イメージサイズを最小化）
COPY --from=builder /app/server .

# マイグレーションファイルもコピー
COPY --from=builder /app/db/migrations ./db/migrations

# ファイルの所有者を非rootユーザーに変更
RUN chown -R appuser:appgroup /app

# 非rootユーザーに切り替え
USER appuser

EXPOSE 8080

# サーバーを起動
CMD ["./server"]
