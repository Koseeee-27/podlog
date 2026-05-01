package usecase

import "fmt"

// ── ユースケース層のカスタムエラー型 ──
// handler 層が errors.As / errors.Is で HTTP ステータスを判定できるようにする。
// strings.Contains によるフラジャイルなエラー判定を避けるために定義。

// NotFoundError はリソースが見つからないことを表すエラーです。
// handler 層では 404 Not Found を返します。
type NotFoundError struct {
	Resource string // "podcast", "episode", "profile" など
}

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("%s not found", e.Resource)
}

// ValidationError はバリデーション失敗を表すエラーです。
// handler 層では 400 Bad Request を返します。
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

// ConflictError はリソースの競合（重複）を表すエラーです。
// handler 層では 409 Conflict を返します。
type ConflictError struct {
	Message string
}

func (e *ConflictError) Error() string {
	return e.Message
}

// SSRFBlockedError は SSRF 対策で外部リクエストがブロックされたことを表すエラーです。
// handler 層では 400 Bad Request を返します。
type SSRFBlockedError struct {
	Message string
}

func (e *SSRFBlockedError) Error() string {
	return e.Message
}

// ForbiddenError は認可失敗（操作権限なし）を表すエラーです。
// handler 層では 403 Forbidden を返します。
//
// 用途: リソース自体は存在するが、認証ユーザーが操作権限を持たない場合に使う。
// 例: PUT/DELETE /comments/{id} で「他人のコメント」を操作しようとしたケース。
// リソース不存在は NotFoundError、認可失敗は ForbiddenError と区別する
// （api-design.md の comment 仕様で 403/404 を使い分けるため）。
type ForbiddenError struct {
	Message string
}

func (e *ForbiddenError) Error() string {
	return e.Message
}
