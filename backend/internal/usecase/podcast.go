package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// PodcastSearchResult は番組検索のレスポンスです。
type PodcastSearchResult struct {
	Podcasts []PodcastSearchItem `json:"podcasts"`
	Total    int                 `json:"total"`
}

// PodcastSearchItem は番組検索結果の各レコードです。
// API 設計書に従い、id / title / author / artwork_url / average_rating / total_reviews を含みます。
type PodcastSearchItem struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	Author        *string   `json:"author,omitempty"`
	ArtworkURL    *string   `json:"artwork_url,omitempty"`
	AverageRating float64   `json:"average_rating"`
	TotalReviews  int       `json:"total_reviews"`
}

// PodcastUsecase はポッドキャストに関するビジネスロジックです。
type PodcastUsecase interface {
	Search(ctx context.Context, query string, limit, offset int) (*PodcastSearchResult, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Podcast, error)
}

type podcastUsecase struct {
	podcastRepo repository.PodcastRepository
}

// NewPodcastUsecase は PodcastUsecase の新しいインスタンスを生成します。
// iTunes API クライアントへの依存を除去し、アプリ内 DB 検索のみを使用します。
func NewPodcastUsecase(podcastRepo repository.PodcastRepository) PodcastUsecase {
	return &podcastUsecase{
		podcastRepo: podcastRepo,
	}
}

// Search はアプリ内 DB でポッドキャストをキーワード検索します。
//
// 以前は iTunes API を叩いていましたが、機能要件書の仕様に合わせて
// 「アプリ内 DB に登録済みの番組をキーワードで検索する」に変更しました。
// レスポンスには平均評価とレビュー件数を含みます。
func (u *podcastUsecase) Search(ctx context.Context, query string, limit, offset int) (*PodcastSearchResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	rows, total, err := u.podcastRepo.Search(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to search podcasts: %w", err)
	}

	items := make([]PodcastSearchItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, PodcastSearchItem{
			ID:            row.ID,
			Title:         row.Title,
			Author:        row.Author,
			ArtworkURL:    row.ArtworkURL,
			AverageRating: roundToOneDecimal(row.AverageRating),
			TotalReviews:  row.TotalReviews,
		})
	}

	return &PodcastSearchResult{
		Podcasts: items,
		Total:    total,
	}, nil
}

// GetByID は UUID でポッドキャストを取得します。
func (u *podcastUsecase) GetByID(ctx context.Context, id uuid.UUID) (*model.Podcast, error) {
	podcast, err := u.podcastRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get podcast: %w", err)
	}
	if podcast == nil {
		return nil, &NotFoundError{Resource: "podcast"}
	}
	return podcast, nil
}
