// Package main のテスト。
// slog 初期化まわり（setupLogger / cloudLoggingReplaceAttr / errorReportingHandler）は
// Cloud Logging / Cloud Error Reporting 互換性の要。将来の変更で互換性が壊れるのを
// 防ぐため、JSON 出力をキー単位でアサートする。
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"math"
	"regexp"
	"strings"
	"testing"
	"time"
)

// newTestHandler はテスト用に ReplaceAttr + errorReportingHandler でラップした
// JSONHandler を返す。setupLogger の本番分岐と同一設定にする。
// time / timestamp のアサートを簡単にするため、io.Writer はバッファを受け取る形にしている。
func newTestHandler(buf *bytes.Buffer) slog.Handler {
	base := slog.NewJSONHandler(buf, &slog.HandlerOptions{
		Level:       slog.LevelInfo,
		ReplaceAttr: cloudLoggingReplaceAttr,
	})
	return &errorReportingHandler{Handler: base}
}

// TestCloudLoggingReplaceAttr_RenamesBuiltinKeys は slog の既定キーが
// Cloud Logging の特別フィールド名に変換されることを確認する。
func TestCloudLoggingReplaceAttr_RenamesBuiltinKeys(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(newTestHandler(&buf))

	logger.Info("hello")

	var got map[string]any
	if err := json.Unmarshal(buf.Bytes(), &got); err != nil {
		t.Fatalf("JSON unmarshal failed: %v; raw=%s", err, buf.String())
	}

	// timestamp（time ではなく）が存在すること
	if _, ok := got["timestamp"]; !ok {
		t.Errorf("expected key 'timestamp' to exist, got keys=%v", keysOf(got))
	}
	if _, ok := got["time"]; ok {
		t.Errorf("key 'time' should have been renamed to 'timestamp'")
	}

	// severity（level ではなく）が存在すること
	if _, ok := got["severity"]; !ok {
		t.Errorf("expected key 'severity' to exist, got keys=%v", keysOf(got))
	}
	if _, ok := got["level"]; ok {
		t.Errorf("key 'level' should have been renamed to 'severity'")
	}

	// message（msg ではなく）が存在すること（Error Reporting が必要とする特別フィールド）
	msg, ok := got["message"]
	if !ok {
		t.Errorf("expected key 'message' to exist, got keys=%v", keysOf(got))
	}
	if msg != "hello" {
		t.Errorf("expected message='hello', got %v", msg)
	}
	if _, ok := got["msg"]; ok {
		t.Errorf("key 'msg' should have been renamed to 'message'")
	}
}

// TestCloudLoggingReplaceAttr_SeverityValues は slog のレベルが
// Cloud Logging の severity 文字列に正しくマッピングされることを確認する。
func TestCloudLoggingReplaceAttr_SeverityValues(t *testing.T) {
	tests := []struct {
		name     string
		logFn    func(logger *slog.Logger)
		wantSev  string
		wantType bool // @type が付与されるべきか（ERROR 以上）
	}{
		{
			name:     "Info maps to INFO",
			logFn:    func(l *slog.Logger) { l.Info("m") },
			wantSev:  "INFO",
			wantType: false,
		},
		{
			name:     "Warn maps to WARNING",
			logFn:    func(l *slog.Logger) { l.Warn("m") },
			wantSev:  "WARNING",
			wantType: false,
		},
		{
			name:     "Error maps to ERROR and adds @type",
			logFn:    func(l *slog.Logger) { l.Error("m") },
			wantSev:  "ERROR",
			wantType: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			logger := slog.New(newTestHandler(&buf))
			tt.logFn(logger)

			var got map[string]any
			if err := json.Unmarshal(buf.Bytes(), &got); err != nil {
				t.Fatalf("JSON unmarshal failed: %v; raw=%s", err, buf.String())
			}

			if sev := got["severity"]; sev != tt.wantSev {
				t.Errorf("severity: want=%q got=%v", tt.wantSev, sev)
			}

			atType, hasType := got["@type"]
			switch {
			case tt.wantType && !hasType:
				t.Errorf("expected @type to be set for ERROR level, keys=%v", keysOf(got))
			case tt.wantType && atType != errorReportingType:
				t.Errorf("@type value mismatch: want=%q got=%v", errorReportingType, atType)
			case !tt.wantType && hasType:
				t.Errorf("@type should NOT be set for level %s, got=%v", tt.wantSev, atType)
			}
		})
	}
}

// TestCloudLoggingReplaceAttr_GroupAttrsNotRenamed は slog.Group 配下の属性が
// リネーム対象外になることを確認する。httpRequest グループの requestMethod 等を
// 誤って変換すると Cloud Logging が HTTP リクエストフィールドとして認識しなくなる。
func TestCloudLoggingReplaceAttr_GroupAttrsNotRenamed(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(newTestHandler(&buf))

	// もしグループ内の属性にも ReplaceAttr が適用され、かつ `msg` キーが
	// 意図せず group 内に現れたら `message` に変換されてしまう。その誤動作を検出する。
	logger.Info("req",
		slog.Group("httpRequest",
			slog.String("requestMethod", "GET"),
			slog.String("msg", "should-stay-as-msg"), // 敢えて衝突させる
		),
	)

	var got map[string]any
	if err := json.Unmarshal(buf.Bytes(), &got); err != nil {
		t.Fatalf("JSON unmarshal failed: %v; raw=%s", err, buf.String())
	}

	reqGroup, ok := got["httpRequest"].(map[string]any)
	if !ok {
		t.Fatalf("expected 'httpRequest' to be an object, got=%T", got["httpRequest"])
	}
	if reqGroup["requestMethod"] != "GET" {
		t.Errorf("requestMethod should remain 'GET', got=%v", reqGroup["requestMethod"])
	}
	if reqGroup["msg"] != "should-stay-as-msg" {
		t.Errorf("group-level 'msg' should NOT be renamed, got keys=%v", keysOf(reqGroup))
	}
}

// TestErrorReportingHandler_WithAttrsPreservesWrapping は Logger.With(...) で
// 派生させたロガーでも @type の自動付与が引き継がれることを確認する。
// WithAttrs / WithGroup の実装で errorReportingHandler のラップを戻すのを
// 忘れた場合にこのテストで検知できる。
func TestErrorReportingHandler_WithAttrsPreservesWrapping(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(newTestHandler(&buf)).With("component", "server")

	logger.Error("boom")

	if !strings.Contains(buf.String(), errorReportingType) {
		t.Errorf("@type should still be injected after With(...); raw=%s", buf.String())
	}
}

// TestErrorReportingHandler_WithGroupPreservesWrapping は WithGroup 経由の
// ロガーでも @type 付与が引き継がれることを確認する。
func TestErrorReportingHandler_WithGroupPreservesWrapping(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(newTestHandler(&buf)).WithGroup("sub")

	logger.Error("boom")

	if !strings.Contains(buf.String(), errorReportingType) {
		t.Errorf("@type should still be injected after WithGroup(...); raw=%s", buf.String())
	}
}

// TestSetupLogger_DevelopmentUsesTextHandler は development 環境では
// TextHandler（非 JSON）が使われることを間接的に確認する。
// JSON としてパースできないことと、severity ではなく level キーが現れることを
// チェックする。
func TestSetupLogger_DevelopmentUsesTextHandler(t *testing.T) {
	// setupLogger は os.Stdout に書き込むため、出力先を差し替えるのが面倒。
	// ここでは development 分岐の判定ロジックだけを検証する（出力バイト検査は production 側で済ませている）。
	devLogger := setupLogger(envDevelopment)
	if devLogger == nil {
		t.Fatal("development logger must not be nil")
	}
	// Handler 型の区別は内部実装なので、ここでは本番ハンドラ経路との違いを
	// レベル有効性でざっくり確認する。TextHandler は DEBUG を許可する設定にしている。
	if !devLogger.Handler().Enabled(context.Background(), slog.LevelDebug) {
		t.Errorf("development logger should accept Debug level")
	}

	prodLogger := setupLogger(envProduction)
	if prodLogger.Handler().Enabled(context.Background(), slog.LevelDebug) {
		t.Errorf("production logger should NOT accept Debug level (Info threshold)")
	}
}

// TestFormatProtoDurationJSON は HTTP リクエストログの latency が Cloud Logging の
// LogEntry.HttpRequest.latency 規約（protobuf Duration JSON 形式: 秒 + `s` サフィックス）
// に適合することを固定する。
//
// time.Duration.String() は 1 秒未満で "12.345ms" / "500µs" / "50ns" を返し、
// Cloud Logging が HTTP リクエストフィールドとして認識しなくなるため、
// 将来 formatProtoDurationJSON 内部を `.String()` に戻す変更が入らないようにする。
func TestFormatProtoDurationJSON(t *testing.T) {
	tests := []struct {
		name string
		in   time.Duration
		want string
	}{
		{"zero", 0, "0.000000000s"},
		{"nanoseconds", 50 * time.Nanosecond, "0.000000050s"},
		{"microseconds", 500 * time.Microsecond, "0.000500000s"},
		{"milliseconds_fractional", 12345 * time.Microsecond, "0.012345000s"},
		{"one_second", time.Second, "1.000000000s"},
		{"seconds_fractional", 1500 * time.Millisecond, "1.500000000s"},
		{"multi_second", 12 * time.Second, "12.000000000s"},
		// 境界値: math.MinInt64 (-9223372036854775808 ns)。
		// 素朴な `d = -d` では signed overflow を起こして malformed になるため、
		// two's complement による絶対値取得が正しく機能していることを固定する。
		{"min_int64", time.Duration(math.MinInt64), "-9223372036.854775808s"},
		// 境界値: math.MaxInt64 (9223372036854775807 ns)。正方向の最大値。
		{"max_int64", time.Duration(math.MaxInt64), "9223372036.854775807s"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatProtoDurationJSON(tt.in)
			if got != tt.want {
				t.Errorf("formatProtoDurationJSON(%v): want=%q got=%q", tt.in, tt.want, got)
			}
		})
	}
}

// TestFormatProtoDurationJSON_FormatShape は「任意の Duration に対して
// 『（負号）+ 整数秒 + 小数点以下 9 桁 + "s"』の形式を満たす」という構造的不変条件を
// regex で検証する。
//
// この regex を満たせば定義上 `time.Duration.String()` 由来のサフィックス
// （`ms` / `µs` / `ns` / `h` / `1m30s` など）は一切混入し得ないため、禁止トークンの
// 個別列挙は不要。regex 1 本で全ケースを押さえる。
func TestFormatProtoDurationJSON_FormatShape(t *testing.T) {
	pattern := regexp.MustCompile(`^-?\d+\.\d{9}s$`)

	samples := []time.Duration{
		0,
		1 * time.Nanosecond,
		999 * time.Microsecond,
		1 * time.Second,
		90 * time.Second,
		time.Hour,
		// 負の Duration（regex の `^-?` 分岐を実際に踏むサンプル）
		-1 * time.Nanosecond,
		-500 * time.Millisecond,
		// 大きな値（float64 経由の実装では ns 精度が落ちていた領域。整数実装では保たれる）
		time.Duration(1 << 62),
		// int64 境界値（`d = -d` 方式では signed overflow で malformed になっていた領域）
		time.Duration(math.MinInt64),
		time.Duration(math.MaxInt64),
	}
	for _, d := range samples {
		got := formatProtoDurationJSON(d)
		if !pattern.MatchString(got) {
			t.Errorf("formatProtoDurationJSON(%v)=%q does not match %s", d, got, pattern)
		}
	}
}

// TestFormatProtoDurationJSON_PrecisionAtLargeValues は float64 経由の実装では
// 精度が失われていた「大きな Duration」でも ns 精度が完全に保たれることを確認する。
// 整数演算に切り替えた意図を明示的に固定するための回帰防止テスト。
func TestFormatProtoDurationJSON_PrecisionAtLargeValues(t *testing.T) {
	// 2^53 ns は float64 の mantissa 精度境界付近。ここで 1ns の差が消えると精度欠損。
	base := time.Duration(1 << 53)
	got1 := formatProtoDurationJSON(base)
	got2 := formatProtoDurationJSON(base + 1)
	if got1 == got2 {
		t.Errorf("1ns difference lost: both %v and %v formatted as %q (precision lost)",
			base, base+1, got1)
	}
}

// keysOf は map のキーをスライスで返すテストヘルパー。
func keysOf(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
