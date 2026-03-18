// Package itunes は Apple iTunes Search API のクライアントです。
// ポッドキャストの検索に使用します。
//
// iTunes Search API ドキュメント:
// https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
package itunes

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// SearchResult は iTunes API の検索結果を表す構造体です。
// JSON レスポンスの各フィールドに対応しています。
type SearchResult struct {
	CollectionID   int64  `json:"collectionId"`
	CollectionName string `json:"collectionName"`
	ArtistName     string `json:"artistName"`
	FeedURL        string `json:"feedUrl"`
	ArtworkURL600  string `json:"artworkUrl600"`
	CollectionURL  string `json:"collectionViewUrl"`
	PrimaryGenre   string `json:"primaryGenreName"`
	TrackCount     int    `json:"trackCount"`
}

// SearchResponse は iTunes API の検索レスポンス全体です。
type SearchResponse struct {
	ResultCount int            `json:"resultCount"`
	Results     []SearchResult `json:"results"`
}

// Client は iTunes API クライアントです。
type Client struct {
	httpClient *http.Client
	baseURL    string
}

// NewClient は iTunes API クライアントを生成します。
// タイムアウトを10秒に設定して、外部APIが応答しない場合に無限待ちを防ぎます。
func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		baseURL: "https://itunes.apple.com",
	}
}

// SetBaseURL はテスト用に API のベース URL を差し替えるメソッドです。
// httptest.NewServer で立てたモックサーバーの URL を設定する際に使います。
func (c *Client) SetBaseURL(url string) {
	c.baseURL = url
}

// SearchPodcasts はキーワードでポッドキャストを検索します。
//
// パラメータ:
//   - term: 検索キーワード
//   - limit: 最大取得件数（iTunes API は最大200件）
//
// 内部で行っていること:
//  1. URL にクエリパラメータを組み立て
//  2. HTTP GET リクエストを送信
//  3. JSON レスポンスを構造体にデコード
func (c *Client) SearchPodcasts(ctx context.Context, term string, limit int) ([]SearchResult, error) {
	// url.Values でクエリパラメータを安全に組み立て（URLエスケープを自動で行う）
	params := url.Values{
		"term":    {term},
		"media":   {"podcast"},
		"entity":  {"podcast"},
		"limit":   {fmt.Sprintf("%d", limit)},
		"country": {"JP"},
	}

	reqURL := fmt.Sprintf("%s/search?%s", c.baseURL, params.Encode())

	// context 付きのリクエストを作成（キャンセルやタイムアウトに対応）
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// リクエスト送信
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request to iTunes API: %w", err)
	}
	// defer で関数終了時にレスポンスボディを確実に閉じる（リソースリーク防止）
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("iTunes API returned status %d", resp.StatusCode)
	}

	// JSON をデコード
	var searchResp SearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return nil, fmt.Errorf("failed to decode iTunes API response: %w", err)
	}

	return searchResp.Results, nil
}

// LookupByID は iTunes ID（collectionId）を指定して1件のポッドキャスト情報を取得します。
//
// iTunes Lookup API を使います。Search API とはエンドポイントが異なり、
// ID を直接指定して情報を取得できます。
// バッチ処理で既存番組のジャンル情報を埋める際に使用します。
//
// 見つからなかった場合は nil を返します（エラーにはしません）。
func (c *Client) LookupByID(ctx context.Context, itunesID int64) (*SearchResult, error) {
	reqURL := fmt.Sprintf("%s/lookup?id=%d&entity=podcast&country=JP", c.baseURL, itunesID)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request to iTunes API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("iTunes API returned status %d", resp.StatusCode)
	}

	var searchResp SearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return nil, fmt.Errorf("failed to decode iTunes API response: %w", err)
	}

	// Lookup API は resultCount=0 で見つからなかったことを示す
	if searchResp.ResultCount == 0 || len(searchResp.Results) == 0 {
		return nil, nil
	}

	return &searchResp.Results[0], nil
}
