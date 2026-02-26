// Package ogp はURLからOGP（Open Graph Protocol）情報を取得するスクレイパーです。
// Radiko など iTunes 以外のソースからポッドキャスト情報を取得する際に使用します。
//
// OGP とは:
// WebページのメタデータをHTMLの <meta> タグで提供する規格です。
// og:title, og:description, og:image などのプロパティがあります。
package ogp

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/kobayashikosei/podlog/backend/internal/util"
	"golang.org/x/net/html"
)

// OGPData はOGP情報を保持する構造体です。
type OGPData struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
	URL         string `json:"url"`
	SiteName    string `json:"site_name"`
}

// Scraper はOGPスクレイパーです。
type Scraper struct {
	httpClient *http.Client
}

// NewScraper は OGP Scraper を生成します。
// セキュリティ対策:
// - タイムアウト5秒: 応答の遅いサーバーに引きずられない
// - レスポンスサイズ制限（Fetch内で実施）: メモリ枯渇を防止
func NewScraper() *Scraper {
	return &Scraper{
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// Fetch は指定URLからOGP情報を取得します。
//
// セキュリティ考慮事項（SSRF対策）:
//  1. HTTPS のみ許可（HTTPは拒否）
//  2. プライベートIPアドレスへのリクエストを禁止
//  3. レスポンスサイズを1MBに制限
func (s *Scraper) Fetch(ctx context.Context, targetURL string) (*OGPData, error) {
	// 1. URLをパースして安全性を検証
	parsed, err := url.Parse(targetURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	// HTTPS のみ許可
	if parsed.Scheme != "https" {
		return nil, fmt.Errorf("only HTTPS URLs are allowed")
	}

	// 2. ホスト名を解決してプライベートIPでないことを確認
	host := parsed.Hostname()
	ips, err := net.LookupIP(host)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve host: %w", err)
	}
	for _, ip := range ips {
		if util.IsPrivateIP(ip) {
			return nil, fmt.Errorf("access to private IP addresses is not allowed")
		}
	}

	// 3. HTTP GETリクエストを送信
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "PodlogBot/1.0")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("URL returned status %d", resp.StatusCode)
	}

	// 4. レスポンスサイズを1MBに制限（メモリ枯渇防止）
	// io.LimitReader は指定バイト数以上読み込まないようにするラッパーです
	limitedReader := io.LimitReader(resp.Body, 1*1024*1024) // 1MB

	// 5. HTMLをパースしてOGPタグを抽出
	return parseOGP(limitedReader)
}

// parseOGP はHTMLからOGPメタタグを解析します。
// Go の標準ライブラリ html パッケージでHTMLをトークン単位で読み進めます。
func parseOGP(r io.Reader) (*OGPData, error) {
	tokenizer := html.NewTokenizer(r)
	data := &OGPData{}

	for {
		tt := tokenizer.Next()
		switch tt {
		case html.ErrorToken:
			// ファイル末尾に到達
			return data, nil
		case html.StartTagToken, html.SelfClosingTagToken:
			token := tokenizer.Token()
			if token.Data != "meta" {
				continue
			}

			// <meta property="og:title" content="..." /> のように
			// property 属性と content 属性を読み取る
			var property, content string
			for _, attr := range token.Attr {
				if attr.Key == "property" {
					property = attr.Val
				}
				if attr.Key == "content" {
					content = attr.Val
				}
			}

			// OGP プロパティに対応するフィールドに値をセット
			switch property {
			case "og:title":
				data.Title = content
			case "og:description":
				data.Description = content
			case "og:image":
				data.Image = content
			case "og:url":
				data.URL = content
			case "og:site_name":
				data.SiteName = content
			}
		}
	}
}

