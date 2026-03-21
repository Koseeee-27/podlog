package rss

import (
	"errors"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"
)

// ── parseDuration テスト ──

func TestParseDuration_SecondsOnly(t *testing.T) {
	// "3600" → 秒数のみの形式
	ms, err := parseDuration("3600")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if ms != 3600000 {
		t.Errorf("expected 3600000ms, got %d", ms)
	}
}

func TestParseDuration_MinutesSeconds(t *testing.T) {
	// "30:00" → MM:SS 形式
	ms, err := parseDuration("30:00")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if ms != 1800000 {
		t.Errorf("expected 1800000ms, got %d", ms)
	}
}

func TestParseDuration_HoursMinutesSeconds(t *testing.T) {
	// "1:30:00" → HH:MM:SS 形式
	ms, err := parseDuration("1:30:00")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if ms != 5400000 {
		t.Errorf("expected 5400000ms, got %d", ms)
	}
}

func TestParseDuration_WithWhitespace(t *testing.T) {
	// 前後に空白がある場合もパースできること
	ms, err := parseDuration("  60  ")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if ms != 60000 {
		t.Errorf("expected 60000ms, got %d", ms)
	}
}

func TestParseDuration_Zero(t *testing.T) {
	ms, err := parseDuration("0")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if ms != 0 {
		t.Errorf("expected 0ms, got %d", ms)
	}
}

func TestParseDuration_Invalid(t *testing.T) {
	_, err := parseDuration("invalid")
	if err == nil {
		t.Fatal("expected error for invalid duration, got nil")
	}
}

func TestParseDuration_TooManyParts(t *testing.T) {
	_, err := parseDuration("1:2:3:4")
	if err == nil {
		t.Fatal("expected error for too many parts, got nil")
	}
}

// ── parseRSSDate テスト ──

func TestParseRSSDate_RFC1123Z(t *testing.T) {
	// RFC1123Z 形式: "Mon, 02 Jan 2006 15:04:05 -0700"
	result, err := parseRSSDate("Wed, 15 Jan 2025 10:00:00 +0900")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	expected := time.Date(2025, 1, 15, 10, 0, 0, 0, time.FixedZone("", 9*3600))
	if !result.Equal(expected) {
		t.Errorf("expected %v, got %v", expected, result)
	}
}

func TestParseRSSDate_RFC1123(t *testing.T) {
	// RFC1123 形式: "Mon, 02 Jan 2006 15:04:05 MST"
	result, err := parseRSSDate("Wed, 15 Jan 2025 10:00:00 UTC")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Year() != 2025 || result.Month() != 1 || result.Day() != 15 {
		t.Errorf("unexpected date: %v", result)
	}
}

func TestParseRSSDate_SingleDigitDay(t *testing.T) {
	// 日が1桁の場合: "Mon, 2 Jan 2006 15:04:05 -0700"
	result, err := parseRSSDate("Wed, 5 Feb 2025 08:30:00 +0000")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Day() != 5 || result.Month() != 2 {
		t.Errorf("unexpected date: %v", result)
	}
}

func TestParseRSSDate_RFC3339(t *testing.T) {
	// RFC3339 形式
	result, err := parseRSSDate("2025-01-15T10:00:00Z")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Year() != 2025 || result.Month() != 1 || result.Day() != 15 {
		t.Errorf("unexpected date: %v", result)
	}
}

func TestParseRSSDate_Invalid(t *testing.T) {
	_, err := parseRSSDate("not-a-date")
	if err == nil {
		t.Fatal("expected error for invalid date, got nil")
	}
}

// ── parseFeed テスト ──

func TestParseFeed_BasicRSS(t *testing.T) {
	// 基本的な RSS 2.0 フィードの XML
	xmlData := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>テストポッドキャスト</title>
    <item>
      <title>エピソード1</title>
      <description>最初のエピソード</description>
      <guid>ep-001</guid>
      <link>https://example.com/ep1</link>
      <pubDate>Wed, 15 Jan 2025 10:00:00 +0000</pubDate>
      <enclosure url="https://example.com/ep1.mp3" type="audio/mpeg" />
      <itunes:duration>1:30:00</itunes:duration>
      <itunes:image href="https://example.com/ep1.jpg" />
    </item>
    <item>
      <title>エピソード2</title>
      <description>2番目のエピソード</description>
      <guid>ep-002</guid>
      <enclosure url="https://example.com/ep2.mp3" type="audio/mpeg" />
      <itunes:duration>3600</itunes:duration>
    </item>
  </channel>
</rss>`

	items, err := parseFeed(strings.NewReader(xmlData))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}

	// 1件目の検証
	ep1 := items[0]
	if ep1.Title != "エピソード1" {
		t.Errorf("expected title 'エピソード1', got '%s'", ep1.Title)
	}
	if ep1.Description != "最初のエピソード" {
		t.Errorf("expected description '最初のエピソード', got '%s'", ep1.Description)
	}
	if ep1.GUID != "ep-001" {
		t.Errorf("expected GUID 'ep-001', got '%s'", ep1.GUID)
	}
	if ep1.AudioURL != "https://example.com/ep1.mp3" {
		t.Errorf("expected audio URL, got '%s'", ep1.AudioURL)
	}
	if ep1.Link != "https://example.com/ep1" {
		t.Errorf("expected link, got '%s'", ep1.Link)
	}
	if ep1.ImageURL != "https://example.com/ep1.jpg" {
		t.Errorf("expected image URL, got '%s'", ep1.ImageURL)
	}
	if ep1.DurationMs == nil || *ep1.DurationMs != 5400000 {
		t.Errorf("expected duration 5400000ms, got %v", ep1.DurationMs)
	}
	if ep1.PubDate == nil {
		t.Error("expected pub date to be set")
	}

	// 2件目の検証
	ep2 := items[1]
	if ep2.Title != "エピソード2" {
		t.Errorf("expected title 'エピソード2', got '%s'", ep2.Title)
	}
	if ep2.DurationMs == nil || *ep2.DurationMs != 3600000 {
		t.Errorf("expected duration 3600000ms, got %v", ep2.DurationMs)
	}
}

func TestParseFeed_EmptyChannel(t *testing.T) {
	xmlData := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>空のポッドキャスト</title>
  </channel>
</rss>`

	items, err := parseFeed(strings.NewReader(xmlData))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(items) != 0 {
		t.Errorf("expected 0 items, got %d", len(items))
	}
}

func TestParseFeed_InvalidXML(t *testing.T) {
	_, err := parseFeed(strings.NewReader("not xml at all"))
	if err == nil {
		t.Fatal("expected error for invalid XML, got nil")
	}
}

func TestParseFeed_MissingOptionalFields(t *testing.T) {
	// オプショナルフィールド（duration, pubDate, image）がない場合
	xmlData := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>最小限のエピソード</title>
      <guid>min-ep</guid>
    </item>
  </channel>
</rss>`

	items, err := parseFeed(strings.NewReader(xmlData))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}

	ep := items[0]
	if ep.Title != "最小限のエピソード" {
		t.Errorf("expected title '最小限のエピソード', got '%s'", ep.Title)
	}
	if ep.DurationMs != nil {
		t.Error("expected nil duration for missing field")
	}
	if ep.PubDate != nil {
		t.Error("expected nil pub date for missing field")
	}
	if ep.AudioURL != "" {
		t.Error("expected empty audio URL for missing enclosure")
	}
}

// ── CheckRedirect テスト ──

// TestCheckRedirect_BlocksHTTP は、リダイレクト先が HTTP（非 HTTPS）の場合に
// ErrSSRFBlocked としてブロックされることを検証する。
func TestCheckRedirect_BlocksHTTP(t *testing.T) {
	client := NewClient()

	// CheckRedirect を直接呼び出すために、HTTP の URL を持つリクエストを作る
	req := &http.Request{
		URL: &url.URL{Scheme: "http", Host: "example.com", Path: "/feed"},
	}
	// via は1件（リダイレクト回数上限とは別のテスト）
	via := []*http.Request{
		{URL: &url.URL{Scheme: "https", Host: "example.com"}},
	}

	err := client.httpClient.CheckRedirect(req, via)
	if err == nil {
		t.Fatal("expected error for HTTP redirect, got nil")
	}
	if !errors.Is(err, ErrSSRFBlocked) {
		t.Errorf("expected ErrSSRFBlocked, got %v", err)
	}
}

// TestCheckRedirect_AllowsHTTPS は、リダイレクト先が HTTPS の場合に
// エラーにならず許可されることを検証する。
func TestCheckRedirect_AllowsHTTPS(t *testing.T) {
	client := NewClient()

	req := &http.Request{
		URL: &url.URL{Scheme: "https", Host: "example.com", Path: "/feed"},
	}
	via := []*http.Request{
		{URL: &url.URL{Scheme: "https", Host: "example.com"}},
	}

	err := client.httpClient.CheckRedirect(req, via)
	if err != nil {
		t.Fatalf("expected no error for HTTPS redirect, got %v", err)
	}
}

// TestCheckRedirect_TooManyRedirects は、リダイレクト回数が 10 回以上の場合に
// エラーになることを検証する。
func TestCheckRedirect_TooManyRedirects(t *testing.T) {
	client := NewClient()

	// リダイレクト先は HTTPS（スキーム検証は通る）
	req := &http.Request{
		URL: &url.URL{Scheme: "https", Host: "example.com", Path: "/feed"},
	}
	// via に maxRedirects 件のリクエストを入れる（= 上限超過）
	via := make([]*http.Request, maxRedirects)
	for i := range via {
		via[i] = &http.Request{
			URL: &url.URL{Scheme: "https", Host: "example.com"},
		}
	}

	err := client.httpClient.CheckRedirect(req, via)
	if err == nil {
		t.Fatal("expected error for too many redirects, got nil")
	}
	if !errors.Is(err, errTooManyRedirects) {
		t.Errorf("expected errTooManyRedirects, got %v", err)
	}
}
