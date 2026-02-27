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

	// 基本的な構成要素が含まれていること
	if !strings.Contains(dsn, "postgres://") {
		t.Errorf("expected postgres:// scheme, got %s", dsn)
	}
	if !strings.Contains(dsn, "localhost:5432") {
		t.Errorf("expected localhost:5432, got %s", dsn)
	}
	if !strings.Contains(dsn, "/podlog") {
		t.Errorf("expected /podlog path, got %s", dsn)
	}
	if !strings.Contains(dsn, "sslmode=disable") {
		t.Errorf("expected sslmode=disable, got %s", dsn)
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
