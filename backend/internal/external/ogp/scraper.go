// Package ogp はURLからOGP（Open Graph Protocol）情報を取得するスクレイパーです。
// Radiko など iTunes 以外のソースからポッドキャスト情報を取得する際に使用します。
//
// OGP とは:
// WebページのメタデータをHTMLの <meta> タグで提供する規格です。
// og:title, og:description, og:image などのプロパティがあります。
package ogp

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/Koseeee-27/podlog/backend/internal/util"
	"golang.org/x/net/html"
)

// ErrSSRFBlocked は SSRF 対策でリクエストがブロックされたことを表す sentinel error です。
var ErrSSRFBlocked = errors.New("SSRF blocked")

// SSRFError は SSRF 対策でブロックされた際の詳細情報を持つエラーです。
type SSRFError struct {
	Reason string
}

func (e *SSRFError) Error() string {
	return e.Reason
}

// Unwrap は ErrSSRFBlocked を返すことで errors.Is(err, ErrSSRFBlocked) を可能にします。
func (e *SSRFError) Unwrap() error {
	return ErrSSRFBlocked
}

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
// カスタム Transport を使用して、接続時（DialContext）に IP アドレスを検証します。
// これにより DNS rebinding 攻撃（TOCTOU 脆弱性）を防止します。
//
// DNS rebinding 攻撃とは:
//   - 事前の DNS 解決チェックでは安全な IP が返る
//   - 実際の HTTP 接続時に DNS が変更され、プライベート IP に接続される
//
// DialContext 内で IP を検証することで、接続直前の IP を確認でき、この攻撃を防げます。
func NewScraper() *Scraper {
	dialer := &net.Dialer{
		Timeout: 5 * time.Second,
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			// addr は "host:port" 形式なのでホスト部分を取り出す
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, fmt.Errorf("invalid address: %w", err)
			}

			// ホスト名を解決して全ての IP をチェック
			ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
			if err != nil {
				return nil, fmt.Errorf("failed to resolve host: %w", err)
			}

			for _, ipAddr := range ips {
				if util.IsPrivateIP(ipAddr.IP) {
					return nil, &SSRFError{Reason: "access to private IP addresses is not allowed"}
				}
			}

			// 検証済みの IP アドレスに直接接続する（DNS を再解決させない）
			return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].IP.String(), port))
		},
	}

	return &Scraper{
		httpClient: &http.Client{
			Timeout:   5 * time.Second,
			Transport: transport,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				// リダイレクト先も HTTPS のみ許可（HTTPS→HTTP の迂回を防止）
				if req.URL.Scheme != "https" {
					return &SSRFError{Reason: "redirect to non-HTTPS URL is not allowed"}
				}
				// ホスト/IP の検証は DialContext で接続時に自動的に行われる
				return nil
			},
		},
	}
}

// Fetch は指定URLからOGP情報を取得します。
//
// セキュリティ考慮事項（SSRF対策）:
//  1. HTTPS のみ許可（HTTPは拒否）
//  2. リダイレクト先も HTTPS のみ許可（CheckRedirect で検証）
//  3. プライベートIPアドレスへのリクエストを DialContext 内で禁止（DNS rebinding 対策）
//  4. レスポンスサイズを1MBに制限
func (s *Scraper) Fetch(ctx context.Context, targetURL string) (*OGPData, error) {
	// 1. URLをパースして安全性を検証
	parsed, err := url.Parse(targetURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	// HTTPS のみ許可
	if parsed.Scheme != "https" {
		return nil, &SSRFError{Reason: "only HTTPS URLs are allowed"}
	}

	// 2. HTTP GETリクエストを送信
	// IP 検証は Transport の DialContext 内で接続直前に行われる
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

	// 3. レスポンスサイズを1MBに制限（メモリ枯渇防止）
	// io.LimitReader は指定バイト数以上読み込まないようにするラッパーです
	limitedReader := io.LimitReader(resp.Body, 1*1024*1024) // 1MB

	// 4. HTMLをパースしてOGPタグを抽出
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

