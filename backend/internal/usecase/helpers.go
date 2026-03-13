package usecase

import "math"

// roundToOneDecimal は小数点第1位に丸めます。
// レビューの平均評価など、float64 の値を丸める共通ヘルパーです。
func roundToOneDecimal(v float64) float64 {
	return math.Round(v*10) / 10
}

// strPtr は空文字列を nil に変換し、それ以外はポインタを返すヘルパーです。
// RSS フィードから取得した値など、空文字列を DB に保存したくない場合に使います。
func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
