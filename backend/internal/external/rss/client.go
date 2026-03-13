// Package rss はRSSフィードからポッドキャストのエピソード情報を取得するクライアントです。
// RSS 2.0 形式の XML を解析し、iTunes 名前空間の拡張タグ（itunes:duration, itunes:image 等）にも対応します。
package rss

import (
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/Koseeee-27/podlog/backend/internal/util"
)

// ErrSSRFBlocked は SSRF 対策でリクエストがブロックされたことを表す sentinel error です。
// errors.Is で判定できるようにするため、型ではなく値として定義しています。
var ErrSSRFBlocked = errors.New("SSRF blocked")

// SSRFError は SSRF 対策でブロックされた際の詳細情報を持つエラーです。
// handler 層では errors.As で判定し、400 Bad Request を返します。
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

// FeedItem は RSS フィードの1件のエピソードを表す構造体です。
type FeedItem struct {
	Title       string     // エピソードのタイトル
	Description string     // エピソードの説明
	GUID        string     // グローバル一意識別子（重複検知に使用）
	AudioURL    string     // 音声ファイルのURL（<enclosure> タグから取得）
	DurationMs  *int64     // 再生時間（ミリ秒）
	PubDate     *time.Time // 公開日時
	ImageURL    string     // エピソード固有のアートワークURL
	Link        string     // エピソードのWebページURL
}

// Fetcher は RSS フィードを取得するインターフェースです。
// テスト時にモックに差し替えられるようインターフェースにしています。
type Fetcher interface {
	Fetch(ctx context.Context, feedURL string) ([]FeedItem, error)
}

// Client は RSS フィードを取得する実装です。
type Client struct {
	httpClient *http.Client
}

// NewClient は RSS Client を生成します。
// カスタム Transport を使用して、接続時（DialContext）に IP アドレスを検証します。
// これにより DNS rebinding 攻撃（TOCTOU 脆弱性）を防止します。
//
// DNS rebinding 攻撃とは:
//   - 事前の DNS 解決チェックでは安全な IP が返る
//   - 実際の HTTP 接続時に DNS が変更され、プライベート IP に接続される
//
// DialContext 内で IP を検証することで、接続直前の IP を確認でき、この攻撃を防げます。
func NewClient() *Client {
	// カスタム Dialer: 接続直前に解決された IP アドレスを検証する
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
			// 最初の IP を使って接続
			return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].IP.String(), port))
		},
	}

	return &Client{
		httpClient: &http.Client{
			Timeout:   10 * time.Second,
			Transport: transport,
		},
	}
}

// Fetch は指定された RSS フィード URL からエピソード一覧を取得します。
//
// セキュリティ考慮事項（SSRF対策）:
//  1. HTTPS のみ許可（HTTP は拒否）
//  2. プライベート IP アドレスへのリクエストを DialContext 内で禁止（DNS rebinding 対策）
//  3. レスポンスサイズを 5MB に制限（巨大フィード対策）
func (c *Client) Fetch(ctx context.Context, feedURL string) ([]FeedItem, error) {
	// 1. URL をパースして安全性を検証
	parsed, err := url.Parse(feedURL)
	if err != nil {
		return nil, fmt.Errorf("invalid feed URL: %w", err)
	}

	// HTTPS のみ許可
	if parsed.Scheme != "https" {
		return nil, &SSRFError{Reason: "only HTTPS URLs are allowed"}
	}

	// 2. HTTP GET リクエストを送信
	// IP 検証は Transport の DialContext 内で接続直前に行われる
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, feedURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "PodlogBot/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch feed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("feed returned status %d", resp.StatusCode)
	}

	// 3. レスポンスサイズを 5MB に制限
	limitedReader := io.LimitReader(resp.Body, 5*1024*1024)

	// 4. RSS XML をパース
	return parseFeed(limitedReader)
}

// ── RSS 2.0 XML 構造体 ──
// RSS 2.0 のXML構造をGoの構造体にマッピングします。
// `xml:"..."` タグでXMLの要素名を指定します。

// rssFeed は RSS フィードのルート要素です。
type rssFeed struct {
	XMLName xml.Name   `xml:"rss"`
	Channel rssChannel `xml:"channel"`
}

// rssChannel は RSS の <channel> 要素です。
type rssChannel struct {
	Items []rssItem `xml:"item"`
}

// rssItem は RSS の <item> 要素（=1つのエピソード）です。
type rssItem struct {
	Title       string       `xml:"title"`
	Description string       `xml:"description"`
	GUID        string       `xml:"guid"`
	Link        string       `xml:"link"`
	PubDate     string       `xml:"pubDate"`
	Enclosure   rssEnclosure `xml:"enclosure"`
	// iTunes 名前空間の拡張タグ
	// itunes:duration は "3600" / "30:00" / "1:30:00" のいずれかの形式
	ItunesDuration string `xml:"http://www.itunes.com/dtds/podcast-1.0.dtd duration"`
	ItunesImage    struct {
		Href string `xml:"href,attr"`
	} `xml:"http://www.itunes.com/dtds/podcast-1.0.dtd image"`
}

// rssEnclosure は <enclosure> 要素（音声ファイルの参照）です。
type rssEnclosure struct {
	URL  string `xml:"url,attr"`
	Type string `xml:"type,attr"`
}

// parseFeed は RSS 2.0 XML をパースして FeedItem のスライスに変換します。
// XML bomb 対策として、エンティティ展開を無効化しています。
func parseFeed(r io.Reader) ([]FeedItem, error) {
	var feed rssFeed
	decoder := xml.NewDecoder(r)

	// XML bomb（billion laughs attack）対策:
	// カスタムエンティティマップを空に設定することで、
	// ユーザー定義エンティティの展開を無効化する。
	// これにより <!ENTITY> で定義された再帰的・入れ子のエンティティが展開されなくなる。
	decoder.Entity = map[string]string{}

	decoder.CharsetReader = func(charset string, input io.Reader) (io.Reader, error) {
		// UTF-8 のみサポート（RSS は基本的に UTF-8）
		if strings.EqualFold(charset, "utf-8") || strings.EqualFold(charset, "us-ascii") {
			return input, nil
		}
		return nil, fmt.Errorf("unsupported charset: %s", charset)
	}

	if err := decoder.Decode(&feed); err != nil {
		return nil, fmt.Errorf("failed to parse RSS feed: %w", err)
	}

	items := make([]FeedItem, 0, len(feed.Channel.Items))
	for _, item := range feed.Channel.Items {
		fi := FeedItem{
			Title:       item.Title,
			Description: item.Description,
			GUID:        item.GUID,
			AudioURL:    item.Enclosure.URL,
			Link:        item.Link,
			ImageURL:    item.ItunesImage.Href,
		}

		// itunes:duration をミリ秒に変換
		if item.ItunesDuration != "" {
			if ms, err := parseDuration(item.ItunesDuration); err == nil {
				fi.DurationMs = &ms
			}
		}

		// pubDate を time.Time に変換
		if item.PubDate != "" {
			if t, err := parseRSSDate(item.PubDate); err == nil {
				fi.PubDate = &t
			}
		}

		items = append(items, fi)
	}

	return items, nil
}

// parseDuration は iTunes の duration 文字列をミリ秒に変換します。
// 対応フォーマット:
//   - "3600"    → 秒数のみ → 3600000ms
//   - "30:00"   → MM:SS    → 1800000ms
//   - "1:30:00" → HH:MM:SS → 5400000ms
func parseDuration(s string) (int64, error) {
	s = strings.TrimSpace(s)
	parts := strings.Split(s, ":")

	switch len(parts) {
	case 1:
		// 秒数のみ: "3600"
		sec, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid duration: %s", s)
		}
		return sec * 1000, nil
	case 2:
		// MM:SS: "30:00"
		min, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid duration minutes: %s", s)
		}
		sec, err := strconv.ParseInt(parts[1], 10, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid duration seconds: %s", s)
		}
		return (min*60 + sec) * 1000, nil
	case 3:
		// HH:MM:SS: "1:30:00"
		hour, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid duration hours: %s", s)
		}
		min, err := strconv.ParseInt(parts[1], 10, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid duration minutes: %s", s)
		}
		sec, err := strconv.ParseInt(parts[2], 10, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid duration seconds: %s", s)
		}
		return (hour*3600 + min*60 + sec) * 1000, nil
	default:
		return 0, fmt.Errorf("invalid duration format: %s", s)
	}
}

// parseRSSDate は RSS でよく使われる日付フォーマットをパースします。
// RFC1123Z, RFC1123, RFC822Z, RFC822 など複数のフォーマットに対応します。
func parseRSSDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)

	// RSS で使用される一般的な日付フォーマットを順に試す
	formats := []string{
		time.RFC1123Z,                    // "Mon, 02 Jan 2006 15:04:05 -0700"
		time.RFC1123,                     // "Mon, 02 Jan 2006 15:04:05 MST"
		time.RFC822Z,                     // "02 Jan 06 15:04 -0700"
		time.RFC822,                      // "02 Jan 06 15:04 MST"
		"Mon, 2 Jan 2006 15:04:05 -0700", // 日が1桁の場合
		"Mon, 2 Jan 2006 15:04:05 MST",
		time.RFC3339,                     // "2006-01-02T15:04:05Z07:00"
	}

	for _, format := range formats {
		if t, err := time.Parse(format, s); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse date: %s", s)
}
