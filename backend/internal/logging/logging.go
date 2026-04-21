// Package logging はアプリ全体の構造化ログ (log/slog) の初期化ヘルパーを提供します。
//
// サーバー (cmd/server) とバッチ (cmd/backfill-*) の両方のエントリーポイントから
// 同じ slog 初期化ロジックを呼べるようにし、Cloud Logging / Cloud Error Reporting
// 互換の出力を一箇所に集約します。
//
// 利用イメージ:
//
//	// 起動冒頭で本番相当のロガーを暫定セットし、config 読み込み失敗時のログも
//	// slog に乗せる。config 取得後に環境に応じて差し替える。
//	slog.SetDefault(logging.NewLogger(logging.EnvProduction))
//	cfg, err := config.Load()
//	...
//	slog.SetDefault(logging.NewLogger(cfg.Environment))
package logging

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"
)

// 環境名の定数。typo による設定ミスを防ぐため、文字列リテラルを直接書かず定数で比較する。
// config.Environment の値と対応する。
const (
	EnvDevelopment = "development"
	EnvProduction  = "production"
)

// errorReportingType は Cloud Error Reporting が「エラー」として取り込むための
// @type フィールドの値。severity=ERROR だけでは Error Reporting に検知されないことが
// あるため、ERROR 以上のログにはこの @type を付けて自動検知を確実にする。
// https://cloud.google.com/error-reporting/docs/formatting-error-messages
const errorReportingType = "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent"

// errorReportingHandler は ERROR 以上のログに Cloud Error Reporting が必要とする
// @type フィールドを自動付与する slog.Handler ラッパー。
// Cloud Error Reporting は「severity=ERROR」だけでは検知せず、@type もしくは
// スタックトレース形式のメッセージが必要。本実装では最もシンプルな @type 付与を採用する。
type errorReportingHandler struct {
	slog.Handler
}

// Handle は slog.Handler インターフェースの実装。
// 各ログ出力時にレベルをチェックし、ERROR 以上なら @type 属性を追加してから
// ラップ先のハンドラ（JSONHandler）に委譲する。
func (h *errorReportingHandler) Handle(ctx context.Context, r slog.Record) error {
	if r.Level >= slog.LevelError {
		r.AddAttrs(slog.String("@type", errorReportingType))
	}
	return h.Handler.Handle(ctx, r)
}

// WithAttrs / WithGroup は slog.Handler のインターフェースを満たすために必要。
// ラップ先の戻り値を再度 errorReportingHandler で包んで返すことで、
// Logger.With(...) で派生させたロガーにも ERROR → @type 付与が引き継がれる。
func (h *errorReportingHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &errorReportingHandler{Handler: h.Handler.WithAttrs(attrs)}
}

func (h *errorReportingHandler) WithGroup(name string) slog.Handler {
	return &errorReportingHandler{Handler: h.Handler.WithGroup(name)}
}

// cloudLoggingReplaceAttr は slog.HandlerOptions.ReplaceAttr 用の関数。
// Cloud Logging の構造化ログ規約（https://cloud.google.com/logging/docs/structured-logging）
// に合わせて、slog の組み込みキーを Cloud Logging が「特別フィールド」として
// 認識する名前にリネームする。
//   - level   → severity （Cloud Logging UI でレベル別フィルタに使われる）
//   - time    → timestamp（LogEntry.timestamp の慣用名）
//   - msg     → message  （Cloud Logging UI のサマリー欄に昇格表示される）
//
// グループ配下の属性（例: httpRequest グループの requestMethod 等）は
// リネーム対象外。Cloud Logging 側の規約名をそのまま使うため。
func cloudLoggingReplaceAttr(groups []string, a slog.Attr) slog.Attr {
	if len(groups) > 0 {
		return a
	}
	switch a.Key {
	case slog.LevelKey:
		// 型アサーション失敗時にパニックしないようガードする。
		// 将来 slog の内部仕様が変わって Value が Level でなくなっても
		// ログ全体が落ちないようにする。
		level, ok := a.Value.Any().(slog.Level)
		if !ok {
			return a
		}
		a.Key = "severity"
		switch {
		case level >= slog.LevelError:
			a.Value = slog.StringValue("ERROR")
		case level >= slog.LevelWarn:
			a.Value = slog.StringValue("WARNING")
		case level >= slog.LevelInfo:
			a.Value = slog.StringValue("INFO")
		default:
			a.Value = slog.StringValue("DEBUG")
		}
	case slog.TimeKey:
		a.Key = "timestamp"
	case slog.MessageKey:
		a.Key = "message"
	}
	return a
}

// NewLogger は env に応じた *slog.Logger を返す。
//   - EnvDevelopment: TextHandler（人間が読みやすい形式・DEBUG 以上）
//   - それ以外:       JSONHandler + errorReportingHandler（Cloud Logging 互換・INFO 以上）
//
// 本番 JSON Handler は Cloud Logging の構造化ログ規約に合わせてフィールドをリネームし、
// ERROR 以上には Cloud Error Reporting 用の @type を自動付与する。
// これにより Cloud Run の stdout に JSON を流すだけで、Cloud Logging がレベル別に
// 集約し、Cloud Error Reporting が ERROR を自動検知してくれる。
func NewLogger(env string) *slog.Logger {
	if env == EnvDevelopment {
		return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		}))
	}
	// 本番（EnvProduction）、またはそれ以外の未知値（EnvProduction 相当として扱う）。
	base := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level:       slog.LevelInfo,
		ReplaceAttr: cloudLoggingReplaceAttr,
	})
	return slog.New(&errorReportingHandler{Handler: base})
}

// FormatProtoDurationJSON は time.Duration を protobuf Duration の JSON 形式
// （秒単位 10 進小数 + `s` サフィックス、負号対応、ナノ秒精度まで保持）に変換する。
// Cloud Logging の LogEntry.HttpRequest.latency はこの形式を要求しており、
// `time.Duration.String()` が返す `ms` / `µs` / `ns` サフィックス形式では認識されない。
//
// 仕様: protobuf Duration JSON は小数 0/3/6/9 桁のいずれも許容するが、
// 本実装は常にナノ秒精度の 9 桁固定で出力する（精度情報をフル保持する意図）。
//
// 実装メモ:
//
//  1. 素直に `fmt.Sprintf("%.9fs", d.Seconds())` と書くと `d.Seconds()` が float64
//     経由になり、mantissa 52bit の制約で ~104 日を超える Duration から ns 精度が
//     失われる（関数名と挙動が乖離する）。
//  2. 単純な `d = -d` による絶対値取得は `math.MinInt64` で signed overflow を
//     起こす（`-math.MinInt64` は int64 の範囲外のため、ラップアラウンドで再び
//     MinInt64 に戻り、malformed な "--N.-Ms" 形式を出してしまう）。
//
// 上記 2 点を回避するため、絶対値は two's complement で uint64 に変換してから
// 秒・ns を分割する（`^d + 1` は `-d` と同じビット表現だが uint64 計算なので
// オーバーフローしない）。これにより `math.MinInt64` から `math.MaxInt64` まで
// 完全な精度で出力できる。
//
// 例:
//
//	12_345_000 ns            → "0.012345000s"
//	1_500_000_000 ns         → "1.500000000s"
//	-500 * time.Millisecond  → "-0.500000000s"
//	time.Duration(math.MinInt64) → "-9223372036.854775808s"
//
// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#httprequest
func FormatProtoDurationJSON(d time.Duration) string {
	sign := ""
	var abs uint64
	if d < 0 {
		sign = "-"
		// two's complement で絶対値を取得。`^d` は全 bit 反転、それに +1 することで
		// `-d` と同じビット列になる。uint64 で計算するため、d == math.MinInt64 でも
		// signed overflow が発生しない。
		abs = uint64(^d) + 1
	} else {
		abs = uint64(d)
	}
	sec := abs / uint64(time.Second)
	ns := abs % uint64(time.Second)
	return fmt.Sprintf("%s%d.%09ds", sign, sec, ns)
}
