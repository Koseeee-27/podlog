package storage

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// supabaseStorage は Supabase Storage を使った FileStorage の実装です。
// Supabase Storage の REST API を直接呼び出してファイルをアップロードします。
//
// Supabase Storage API の仕様:
// - PUT /storage/v1/object/{bucket}/{path} でファイルをアップロード（既存ファイルは上書き）
// - Authorization ヘッダーにサービスロールキーを指定
// - 公開 URL は GET /storage/v1/object/public/{bucket}/{path}
type supabaseStorage struct {
	// supabaseURL は Supabase プロジェクトの URL（例: https://xxx.supabase.co）
	supabaseURL string
	// serviceKey は Supabase のサービスロールキー（サーバーサイド専用）
	serviceKey string
	// httpClient は HTTP リクエストに使うクライアント
	httpClient *http.Client
}

// NewSupabaseStorage は Supabase Storage を使う FileStorage を生成します。
func NewSupabaseStorage(supabaseURL, serviceKey string) FileStorage {
	return &supabaseStorage{
		supabaseURL: strings.TrimRight(supabaseURL, "/"),
		serviceKey:  serviceKey,
		httpClient:  &http.Client{Timeout: 30 * time.Second},
	}
}

// Upload は Supabase Storage にファイルをアップロードし、公開 URL を返します。
// 同じパスに既にファイルが存在する場合は上書きされます（アバター更新時に便利）。
func (s *supabaseStorage) Upload(ctx context.Context, bucket, path string, reader io.Reader, contentType string) (string, error) {
	// Supabase Storage API のアップロードエンドポイント
	// PUT を使うことで、ファイルが存在する場合は上書き（upsert）される
	uploadURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.supabaseURL, bucket, path)

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, uploadURL, reader)
	if err != nil {
		return "", fmt.Errorf("failed to create upload request: %w", err)
	}

	// Supabase Storage API に必要なヘッダーを設定
	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("Content-Type", contentType)
	// x-upsert: true を設定すると、同じパスのファイルが存在する場合に上書きする
	req.Header.Set("x-upsert", "true")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("upload failed with status %d: %s", resp.StatusCode, string(body))
	}

	// 公開 URL を組み立てて返す
	// Supabase Storage の公開バケットでは /storage/v1/object/public/{bucket}/{path} で取得可能
	// タイムスタンプをクエリパラメータに付与してブラウザキャッシュを回避する
	publicURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s?t=%d", s.supabaseURL, bucket, path, time.Now().Unix())

	return publicURL, nil
}
