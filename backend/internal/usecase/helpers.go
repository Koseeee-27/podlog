package usecase

// strPtr は文字列のポインタを返すヘルパーです。
// Go では文字列リテラルのアドレスを直接取れないため（&"hello" はエラー）、
// 一度変数に入れてからポインタを返す必要があります。
// 空文字列の場合は nil を返します。
func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
