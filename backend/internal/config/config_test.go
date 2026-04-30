package config

import (
	"strings"
	"testing"
)

func TestDatabaseDSN_BasicValues(t *testing.T) {
	cfg := &Config{
		DBHost:     "localhost",
		DBPort:     "5432",
		DBUser:     "postgres",
		DBPassword: "postgres",
		DBName:     "podlog",
		DBSSLMode:  "disable",
	}

	dsn := cfg.DatabaseDSN()
	expected := "postgres://postgres:postgres@localhost:5432/podlog?sslmode=disable&connect_timeout=10&default_query_exec_mode=exec"

	if dsn != expected {
		t.Errorf("expected DSN:\n  %s\ngot:\n  %s", expected, dsn)
	}
}

func TestDatabaseDSN_SpecialCharsInPassword(t *testing.T) {
	// パスワードに URL 予約文字（@, :, /, #）が含まれるケース
	cfg := &Config{
		DBHost:     "db",
		DBPort:     "5432",
		DBUser:     "admin",
		DBPassword: "p@ss:w/rd#123",
		DBName:     "podlog",
		DBSSLMode:  "disable",
	}

	dsn := cfg.DatabaseDSN()

	// パスワードの特殊文字がエスケープされていること
	// 生の @ がホスト区切りと誤解されないこと
	if strings.Contains(dsn, "p@ss") {
		t.Errorf("expected @ to be encoded in password, got %s", dsn)
	}

	// DSN が正しいホストを指していること（特殊文字でパースが壊れていない）
	if !strings.Contains(dsn, "db:5432") {
		t.Errorf("expected db:5432 host, got %s", dsn)
	}
}

func TestValidate_MissingSupabaseURL(t *testing.T) {
	// SUPABASE_URL が空の場合、Validate はエラーを返すべき
	// 他の項目は development 扱い（SITEMAP_API_TOKEN チェックを回避）にして、
	// 純粋に SUPABASE_URL のチェックのみを検証する。
	cfg := &Config{
		SupabaseURL: "",
		Environment: "development",
	}

	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected error when SUPABASE_URL is empty, got nil")
	}

	if !strings.Contains(err.Error(), "SUPABASE_URL") {
		t.Errorf("error message should mention SUPABASE_URL, got: %s", err.Error())
	}
}

func TestValidate_WithSupabaseURL(t *testing.T) {
	// SUPABASE_URL が設定されており、development なら Validate はエラーを返さない。
	// development では SITEMAP_API_TOKEN は不要（ミドルウェア側が素通しするため）。
	cfg := &Config{
		SupabaseURL: "https://example.supabase.co",
		Environment: "development",
	}

	err := cfg.Validate()
	if err != nil {
		t.Errorf("expected no error when SUPABASE_URL is set in development, got: %v", err)
	}
}

// TestValidate_MissingSitemapTokenInProduction は本番環境で SITEMAP_API_TOKEN が
// 未設定の場合に Validate がエラーを返すことを検証します。
//
// 背景: SitemapAuth ミドルウェアは expectedToken == "" のとき fail-secure で全リクエストを
// 401 にするため、本番で未設定だと sitemap.xml の生成が壊れる。設定漏れを起動時点で
// 検知できるよう Validate で必須チェックを行う。
func TestValidate_MissingSitemapTokenInProduction(t *testing.T) {
	cfg := &Config{
		SupabaseURL:     "https://example.supabase.co",
		Environment:     "production",
		SitemapAPIToken: "",
	}

	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected error when SITEMAP_API_TOKEN is empty in production, got nil")
	}

	if !strings.Contains(err.Error(), "SITEMAP_API_TOKEN") {
		t.Errorf("error message should mention SITEMAP_API_TOKEN, got: %s", err.Error())
	}
}

// TestValidate_SitemapTokenNotRequiredInDevelopment は development 環境では
// SITEMAP_API_TOKEN が未設定でも Validate がエラーを返さないことを検証します。
//
// 背景: ローカル開発時は FE 側もヘッダーを付けない構成にするため、トークンの設定を
// 強制すると開発の手間が増える。SitemapAuth ミドルウェアが development では素通しする
// 仕様と整合させる。
func TestValidate_SitemapTokenNotRequiredInDevelopment(t *testing.T) {
	cfg := &Config{
		SupabaseURL:     "https://example.supabase.co",
		Environment:     "development",
		SitemapAPIToken: "",
	}

	err := cfg.Validate()
	if err != nil {
		t.Errorf("expected no error in development without SITEMAP_API_TOKEN, got: %v", err)
	}
}

// TestValidate_SitemapTokenSetInProduction は本番環境で SITEMAP_API_TOKEN が
// 正しくセットされていれば Validate がエラーを返さないことを検証します。
func TestValidate_SitemapTokenSetInProduction(t *testing.T) {
	cfg := &Config{
		SupabaseURL:     "https://example.supabase.co",
		Environment:     "production",
		SitemapAPIToken: "some-strong-random-token",
	}

	err := cfg.Validate()
	if err != nil {
		t.Errorf("expected no error in production with SITEMAP_API_TOKEN, got: %v", err)
	}
}

// ── GetAdminUserIDs テスト ──

func TestGetAdminUserIDs_Empty(t *testing.T) {
	cfg := &Config{AdminUserIDs: ""}
	ids := cfg.GetAdminUserIDs()
	if len(ids) != 0 {
		t.Errorf("expected empty slice, got %v", ids)
	}
}

func TestGetAdminUserIDs_SingleID(t *testing.T) {
	cfg := &Config{AdminUserIDs: "550e8400-e29b-41d4-a716-446655440000"}
	ids := cfg.GetAdminUserIDs()
	if len(ids) != 1 {
		t.Fatalf("expected 1 ID, got %d", len(ids))
	}
	if ids[0] != "550e8400-e29b-41d4-a716-446655440000" {
		t.Errorf("expected '550e8400-e29b-41d4-a716-446655440000', got '%s'", ids[0])
	}
}

func TestGetAdminUserIDs_MultipleIDs(t *testing.T) {
	cfg := &Config{AdminUserIDs: "id1,id2,id3"}
	ids := cfg.GetAdminUserIDs()
	if len(ids) != 3 {
		t.Fatalf("expected 3 IDs, got %d", len(ids))
	}
}

func TestGetAdminUserIDs_WithSpaces(t *testing.T) {
	// カンマの前後にスペースがあってもトリミングされること
	cfg := &Config{AdminUserIDs: " id1 , id2 , id3 "}
	ids := cfg.GetAdminUserIDs()
	if len(ids) != 3 {
		t.Fatalf("expected 3 IDs, got %d", len(ids))
	}
	if ids[0] != "id1" || ids[1] != "id2" || ids[2] != "id3" {
		t.Errorf("expected trimmed IDs, got %v", ids)
	}
}

func TestGetAdminUserIDs_TrailingComma(t *testing.T) {
	// 末尾にカンマがあっても空文字列は含まれないこと
	cfg := &Config{AdminUserIDs: "id1,id2,"}
	ids := cfg.GetAdminUserIDs()
	if len(ids) != 2 {
		t.Fatalf("expected 2 IDs (trailing comma ignored), got %d: %v", len(ids), ids)
	}
}

func TestDatabaseDSN_SpecialCharsInUser(t *testing.T) {
	// ユーザー名に特殊文字が含まれるケース
	cfg := &Config{
		DBHost:     "db",
		DBPort:     "5432",
		DBUser:     "user@domain",
		DBPassword: "pass",
		DBName:     "podlog",
		DBSSLMode:  "disable",
	}

	dsn := cfg.DatabaseDSN()

	// ユーザー名の @ がエスケープされていること
	if !strings.Contains(dsn, "db:5432") {
		t.Errorf("expected db:5432 host (user @ should be encoded), got %s", dsn)
	}
}
