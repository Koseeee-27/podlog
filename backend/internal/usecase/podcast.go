package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// PodcastDetailResult はポッドキャスト詳細のレスポンスです。
// API 設計書に従い、番組情報に加えて average_rating / total_reviews を含みます。
type PodcastDetailResult struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	Author        *string   `json:"author,omitempty"`
	Description   *string   `json:"description,omitempty"`
	ArtworkURL    *string   `json:"artwork_url,omitempty"`
	Genre         *string   `json:"genre,omitempty"`
	FeedURL       *string   `json:"feed_url,omitempty"`
	AverageRating float64   `json:"average_rating"`
	TotalReviews  int       `json:"total_reviews"`
	FavoriteCount int       `json:"favorite_count"`
	CreatedAt     string    `json:"created_at"`
}

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
	FavoriteCount int       `json:"favorite_count"`
}

// CreatePodcastInput は番組手動登録のリクエストを表します。
// 管理用 API からポッドキャストを直接登録する際に使います。
// feed_url がない番組（Spotify 独占等）も登録できるように、FeedURL はオプションです。
type CreatePodcastInput struct {
	Title       string  `json:"title"`
	Author      *string `json:"author,omitempty"`
	ArtworkURL  *string `json:"artwork_url,omitempty"`
	Description *string `json:"description,omitempty"`
	Genre       *string `json:"genre,omitempty"`
}

// PodcastUsecase はポッドキャストに関するビジネスロジックです。
type PodcastUsecase interface {
	Create(ctx context.Context, input CreatePodcastInput) (*model.Podcast, error)
	Search(ctx context.Context, query string, genre string, limit, offset int) (*PodcastSearchResult, error)
	GetPopular(ctx context.Context, limit int) (*PodcastSearchResult, error)
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

// Create は新しいポッドキャストを作成して DB に保存します。
// 管理者が RSS フィードのない番組（Spotify 独占等）を手動登録する際に使います。
//
// 処理の流れ:
//  1. タイトルの必須チェック
//  2. UUID を生成してモデルを構築（source_type は "manual" に設定）
//  3. リポジトリ経由で DB に保存
func (u *podcastUsecase) Create(ctx context.Context, input CreatePodcastInput) (*model.Podcast, error) {
	// 1. バリデーション: タイトルは必須
	input.Title = strings.TrimSpace(input.Title)
	if input.Title == "" {
		return nil, &ValidationError{Message: "title is required"}
	}

	// 2. ポッドキャストモデルを構築
	// source_type を "manual" に設定して、手動登録であることを記録します。
	// これにより iTunes API 経由で登録された番組と区別できます。
	podcast := &model.Podcast{
		ID:          uuid.New(),
		Title:       input.Title,
		Author:      input.Author,
		ArtworkURL:  input.ArtworkURL,
		Description: input.Description,
		Genre:       input.Genre,
		SourceType:  "manual",
	}

	// 3. DB に保存
	if err := u.podcastRepo.Create(ctx, podcast); err != nil {
		return nil, err
	}

	// 4. DB から読み直して created_at / updated_at を含む完全なデータを返す
	created, err := u.podcastRepo.GetByID(ctx, podcast.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve created podcast: %w", err)
	}

	return created, nil
}

// Search はアプリ内 DB でポッドキャストをキーワード検索します。
//
// genre パラメータが指定された場合、ExpandGenre を使って親カテゴリに属する
// 全サブカテゴリに展開してから検索します。
// 例: genre="Comedy" → ["Comedy", "Comedy Fiction", "Comedy Interviews", "Improv", "Stand-Up"]
// これにより、フロントエンドが親カテゴリ「コメディ」を選択したとき、
// サブカテゴリの番組も全てヒットします。
func (u *podcastUsecase) Search(ctx context.Context, query string, genre string, limit, offset int) (*PodcastSearchResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// genre が指定されている場合、親カテゴリに属するサブカテゴリ一覧に展開します。
	// genre が空の場合は空スライスを渡し、ジャンル絞り込みなしで検索します。
	var genres []string
	if genre != "" {
		genres = ExpandGenre(genre)
	}

	rows, total, err := u.podcastRepo.Search(ctx, query, genres, limit, offset)
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
			FavoriteCount: row.FavoriteCount,
		})
	}

	return &PodcastSearchResult{
		Podcasts: items,
		Total:    total,
	}, nil
}

// GetPopular はレビュー件数の多い人気番組を取得します。
func (u *podcastUsecase) GetPopular(ctx context.Context, limit int) (*PodcastSearchResult, error) {
	if limit <= 0 {
		limit = 10
	} else if limit > 50 {
		limit = 50
	}

	rows, err := u.podcastRepo.GetPopular(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get popular podcasts: %w", err)
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
			FavoriteCount: row.FavoriteCount,
		})
	}

	return &PodcastSearchResult{
		Podcasts: items,
		Total:    len(items),
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
