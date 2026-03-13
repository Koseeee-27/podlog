// Package storage はファイルストレージへのアクセスを抽象化する層です。
// インターフェースを定義することで、Supabase Storage 以外のストレージ
// （GCS、S3 など）にも差し替え可能にしています。
package storage

import (
	"context"
	"io"
)

// FileStorage はファイルアップロード・削除の共通インターフェースです。
// usecase 層はこのインターフェースに依存し、具体的なストレージの実装には依存しません。
type FileStorage interface {
	// Upload はファイルをストレージにアップロードし、公開 URL を返します。
	// bucket: ストレージのバケット名（例: "avatars"）
	// path: バケット内のファイルパス（例: "user-id/avatar.png"）
	// reader: アップロードするファイルの読み取りストリーム
	// contentType: ファイルの MIME タイプ（例: "image/png"）
	Upload(ctx context.Context, bucket, path string, reader io.Reader, contentType string) (string, error)
}
