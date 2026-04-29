package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// SitemapPodcastItem は sitemap 用 podcast 1 件のレスポンスです。
type SitemapPodcastItem struct {
	ID        uuid.UUID `json:"id"`
	UpdatedAt string    `json:"updated_at"`
}

// SitemapEpisodeItem は sitemap 用 episode 1 件のレスポンスです。
type SitemapEpisodeItem struct {
	ID        uuid.UUID `json:"id"`
	UpdatedAt string    `json:"updated_at"`
}

// SitemapUserItem は sitemap 用 user 1 件のレスポンスです。
// users は id ではなく username で URL を組み立てるため、id ではなく username を返します。
type SitemapUserItem struct {
	Username  string `json:"username"`
	UpdatedAt string `json:"updated_at"`
}

// SitemapPodcastsResult は GET /sitemap/podcasts のレスポンスです。
type SitemapPodcastsResult struct {
	Items []SitemapPodcastItem `json:"items"`
}

// SitemapEpisodesResult は GET /sitemap/episodes のレスポンスです。
type SitemapEpisodesResult struct {
	Items []SitemapEpisodeItem `json:"items"`
}

// SitemapUsersResult は GET /sitemap/users のレスポンスです。
type SitemapUsersResult struct {
	Items []SitemapUserItem `json:"items"`
}

// SitemapUsecase は FE の sitemap 生成に必要な軽量データの取得を提供します。
type SitemapUsecase interface {
	GetPodcasts(ctx context.Context) (*SitemapPodcastsResult, error)
	GetEpisodes(ctx context.Context) (*SitemapEpisodesResult, error)
	GetUsers(ctx context.Context) (*SitemapUsersResult, error)
}

type sitemapUsecase struct {
	repo repository.SitemapRepository
}

// NewSitemapUsecase は SitemapUsecase の新しいインスタンスを生成します。
func NewSitemapUsecase(repo repository.SitemapRepository) SitemapUsecase {
	return &sitemapUsecase{repo: repo}
}

// GetPodcasts は全 podcast の id / updated_at を返します。
// repository から取得した時刻を RFC3339 文字列に整形してレスポンス DTO に詰め直します。
func (u *sitemapUsecase) GetPodcasts(ctx context.Context) (*SitemapPodcastsResult, error) {
	rows, err := u.repo.ListPodcasts(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get podcasts for sitemap: %w", err)
	}

	// 空でも nil ではなく空スライスを JSON で返したいので、make で 0 長スライスを確保します。
	// （nil スライスは encoding/json で `null` になるため、`[]` を期待する FE 側で揃えるためのお作法）
	items := make([]SitemapPodcastItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, SitemapPodcastItem{
			ID:        row.ID,
			UpdatedAt: row.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}

	return &SitemapPodcastsResult{Items: items}, nil
}

// GetEpisodes は全 episode の id / updated_at を返します。
func (u *sitemapUsecase) GetEpisodes(ctx context.Context) (*SitemapEpisodesResult, error) {
	rows, err := u.repo.ListEpisodes(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get episodes for sitemap: %w", err)
	}

	items := make([]SitemapEpisodeItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, SitemapEpisodeItem{
			ID:        row.ID,
			UpdatedAt: row.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}

	return &SitemapEpisodesResult{Items: items}, nil
}

// GetUsers は有効な全ユーザーの username / updated_at を返します。
// ソフトデリート済みユーザーの除外は repository 層で済ませているため、
// ここでは特別な絞り込みは行いません。
func (u *sitemapUsecase) GetUsers(ctx context.Context) (*SitemapUsersResult, error) {
	rows, err := u.repo.ListUsers(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get users for sitemap: %w", err)
	}

	items := make([]SitemapUserItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, SitemapUserItem{
			Username:  row.Username,
			UpdatedAt: row.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}

	return &SitemapUsersResult{Items: items}, nil
}
