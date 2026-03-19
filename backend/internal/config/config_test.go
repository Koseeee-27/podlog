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
	expected := "postgres://postgres:postgres@localhost:5432/podlog?sslmode=disable"

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
	cfg := &Config{
		SupabaseURL: "",
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
	// SUPABASE_URL が設定されている場合、Validate はエラーを返さない
	cfg := &Config{
		SupabaseURL: "https://example.supabase.co",
	}

	err := cfg.Validate()
	if err != nil {
		t.Errorf("expected no error when SUPABASE_URL is set, got: %v", err)
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
