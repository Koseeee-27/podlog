package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/external/itunes"
	"github.com/kobayashikosei/podlog/backend/internal/model"
	"github.com/kobayashikosei/podlog/backend/internal/repository"
)

// PodcastUsecase はポッドキャストに関するビジネスロジックです。
type PodcastUsecase interface {
	Search(ctx context.Context, query string, limit int) ([]model.Podcast, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Podcast, error)
}

type podcastUsecase struct {
	podcastRepo repository.PodcastRepository
	itunesClient *itunes.Client
}

// NewPodcastUsecase は PodcastUsecase の新しいインスタンスを生成します。
func NewPodcastUsecase(podcastRepo repository.PodcastRepository, itunesClient *itunes.Client) PodcastUsecase {
	return &podcastUsecase{
		podcastRepo:  podcastRepo,
		itunesClient: itunesClient,
	}
}

// Search は iTunes API でポッドキャストを検索し、結果をDBに保存して返します。
//
// 処理の流れ:
//  1. iTunes API に検索リクエストを送信
//  2. 各結果について、既にDBに保存済みか iTunes ID で確認
//  3. 未保存なら新規作成、保存済みならそのまま使用
//  4. 全結果をまとめて返却
func (u *podcastUsecase) Search(ctx context.Context, query string, limit int) ([]model.Podcast, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	// 1. iTunes API で検索
	results, err := u.itunesClient.SearchPodcasts(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search iTunes: %w", err)
	}

	// 2. 各結果をDBに保存または取得
	podcasts := make([]model.Podcast, 0, len(results))
	for _, result := range results {
		// iTunes ID で既存チェック
		existing, err := u.podcastRepo.GetByItunesID(ctx, result.CollectionID)
		if err != nil {
			return nil, fmt.Errorf("failed to check existing podcast: %w", err)
		}

		if existing != nil {
			// 既に保存済み
			podcasts = append(podcasts, *existing)
			continue
		}

		// 新規作成
		podcast := &model.Podcast{
			ID:         uuid.New(),
			ItunesID:   &result.CollectionID,
			Title:      result.CollectionName,
			Author:     strPtr(result.ArtistName),
			FeedURL:    strPtr(result.FeedURL),
			ArtworkURL: strPtr(result.ArtworkURL600),
			ItunesURL:  strPtr(result.CollectionURL),
			Genre:      strPtr(result.PrimaryGenre),
			SourceType: "itunes",
		}

		if err := u.podcastRepo.Create(ctx, podcast); err != nil {
			// 作成失敗してもスキップして続行（並行リクエストでの重複など）
			continue
		}

		podcasts = append(podcasts, *podcast)
	}

	return podcasts, nil
}

// GetByID は UUID でポッドキャストを取得します。
func (u *podcastUsecase) GetByID(ctx context.Context, id uuid.UUID) (*model.Podcast, error) {
	podcast, err := u.podcastRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get podcast: %w", err)
	}
	if podcast == nil {
		return nil, fmt.Errorf("podcast not found")
	}
	return podcast, nil
}

// strPtr は文字列のポインタを返すヘルパーです。
// Go では文字列リテラルのアドレスを直接取れないため（&"hello" はエラー）、
// 一度変数に入れてからポインタを返す必要があります。
func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
