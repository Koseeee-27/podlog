package usecase

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/external/rss"
	"github.com/kobayashikosei/podlog/backend/internal/model"
	"github.com/kobayashikosei/podlog/backend/internal/repository"
)

// CreateEpisodeInput はエピソード作成のリクエストを表します。
// ハンドラーから受け取ったデータをユースケースに渡す際に使います。
type CreateEpisodeInput struct {
	Title         string  `json:"title"`
	Description   *string `json:"description,omitempty"`
	AudioURL      *string `json:"audio_url,omitempty"`
	ArtworkURL    *string `json:"artwork_url,omitempty"`
	SourceURL     *string `json:"source_url,omitempty"`
	DurationMs    *int64  `json:"duration_ms,omitempty"`
	PublishedAt   *string `json:"published_at,omitempty"`
	ItunesTrackID *int64  `json:"itunes_track_id,omitempty"`
}

// CreateEpisodeResult は Create メソッドの戻り値です。
// Created フラグにより、新規作成されたか既存が返されたかをハンドラーが判別できます。
type CreateEpisodeResult struct {
	Episode *model.Episode
	Created bool
}

// FetchFromFeedResult は FetchFromFeed メソッドの戻り値です。
// 新規登録件数・スキップ件数・失敗件数を返します。
type FetchFromFeedResult struct {
	NewCount     int              `json:"new_count"`
	SkippedCount int              `json:"skipped_count"`
	FailedCount  int              `json:"failed_count"`
	Episodes     []model.Episode  `json:"episodes"`
}

// EpisodeUsecase はエピソードに関するビジネスロジックです。
type EpisodeUsecase interface {
	Create(ctx context.Context, podcastID uuid.UUID, input CreateEpisodeInput) (*CreateEpisodeResult, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Episode, error)
	GetByPodcastID(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error)
	FetchFromFeed(ctx context.Context, podcastID uuid.UUID, feedURL string) (*FetchFromFeedResult, error)
}

type episodeUsecase struct {
	episodeRepo repository.EpisodeRepository
	rssFetcher  rss.Fetcher
}

// NewEpisodeUsecase は EpisodeUsecase の新しいインスタンスを生成します。
// rssFetcher には RSS フィード取得クライアントを渡します。
func NewEpisodeUsecase(episodeRepo repository.EpisodeRepository, rssFetcher rss.Fetcher) EpisodeUsecase {
	return &episodeUsecase{
		episodeRepo: episodeRepo,
		rssFetcher:  rssFetcher,
	}
}

// Create は新しいエピソードを作成してDBに保存します。
//
// 処理の流れ:
//  1. タイトルの必須チェック（TrimSpace で空白のみも弾く）
//  2. iTunes Track ID が指定されている場合、既存チェック（既存があればそのまま返却）
//  3. published_at を文字列から time.Time に変換（指定があれば）
//  4. UUID を生成してエピソードモデルを構築
//  5. リポジトリ経由でDBに保存（UNIQUE 違反時は既存を取得して返却）
func (u *episodeUsecase) Create(ctx context.Context, podcastID uuid.UUID, input CreateEpisodeInput) (*CreateEpisodeResult, error) {
	// 1. バリデーション: タイトルは必須（空白のみも不可）
	input.Title = strings.TrimSpace(input.Title)
	if input.Title == "" {
		return nil, &ValidationError{Message: "title is required"}
	}

	// 2. iTunes Track ID の既存チェック
	// 同じ iTunes Track ID のエピソードが既に存在する場合は、新規作成せず既存を返す
	if input.ItunesTrackID != nil {
		existing, err := u.episodeRepo.GetByItunesTrackID(ctx, *input.ItunesTrackID)
		if err != nil {
			return nil, fmt.Errorf("failed to check existing episode: %w", err)
		}
		if existing != nil {
			return &CreateEpisodeResult{Episode: existing, Created: false}, nil
		}
	}

	// 3. published_at の変換（文字列 → time.Time）
	var publishedAt *time.Time
	if input.PublishedAt != nil && *input.PublishedAt != "" {
		t, err := time.Parse(time.RFC3339, *input.PublishedAt)
		if err != nil {
			return nil, &ValidationError{Message: fmt.Sprintf("invalid published_at format (use RFC3339): %v", err)}
		}
		publishedAt = &t
	}

	// 4. エピソードモデルを構築
	episode := &model.Episode{
		ID:            uuid.New(),
		PodcastID:     podcastID,
		ItunesTrackID: input.ItunesTrackID,
		Title:         input.Title,
		Description:   input.Description,
		AudioURL:      input.AudioURL,
		ArtworkURL:    input.ArtworkURL,
		SourceURL:     input.SourceURL,
		DurationMs:    input.DurationMs,
		PublishedAt:   publishedAt,
	}

	// 5. DBに保存
	// 並行リクエストで先に INSERT された場合、UNIQUE 違反が発生する。
	// その場合は既存レコードを取得して返却する（冪等な挙動）。
	if err := u.episodeRepo.Create(ctx, episode); err != nil {
		if input.ItunesTrackID != nil && isUniqueViolation(err) {
			existing, getErr := u.episodeRepo.GetByItunesTrackID(ctx, *input.ItunesTrackID)
			if getErr != nil {
				return nil, fmt.Errorf("failed to get existing episode after unique violation: %w", getErr)
			}
			if existing != nil {
				return &CreateEpisodeResult{Episode: existing, Created: false}, nil
			}
		}
		return nil, fmt.Errorf("failed to create episode: %w", err)
	}

	return &CreateEpisodeResult{Episode: episode, Created: true}, nil
}

// isUniqueViolation は PostgreSQL のユニーク制約違反 (23505) かどうかを判定します。
// lib/pq のエラー型に依存せず、エラーメッセージから判定することで
// ユースケース層がDB実装に直接依存しないようにしています。
func isUniqueViolation(err error) bool {
	return strings.Contains(err.Error(), "unique") ||
		strings.Contains(err.Error(), "duplicate key") ||
		strings.Contains(err.Error(), "23505")
}

// GetByID は UUID でエピソードを取得します。
func (u *episodeUsecase) GetByID(ctx context.Context, id uuid.UUID) (*model.Episode, error) {
	episode, err := u.episodeRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get episode: %w", err)
	}
	if episode == nil {
		return nil, &NotFoundError{Resource: "episode"}
	}
	return episode, nil
}

// GetByPodcastID はポッドキャストIDに紐づくエピソード一覧を取得します。
func (u *episodeUsecase) GetByPodcastID(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	episodes, err := u.episodeRepo.GetByPodcastID(ctx, podcastID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get episodes: %w", err)
	}
	return episodes, nil
}

// FetchFromFeed は RSS フィードからエピソードを取得してDBに登録します。
//
// 処理の流れ:
//  1. RSS フィードを取得してパース
//  2. 各アイテムの GUID で重複チェック
//  3. 新規エピソードのみ DB に保存
//  4. UNIQUE 違反はスキップとして扱う（並行リクエスト対応）
func (u *episodeUsecase) FetchFromFeed(ctx context.Context, podcastID uuid.UUID, feedURL string) (*FetchFromFeedResult, error) {
	// 1. RSS フィードを取得
	items, err := u.rssFetcher.Fetch(ctx, feedURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch RSS feed: %w", err)
	}

	result := &FetchFromFeedResult{
		Episodes: make([]model.Episode, 0),
	}

	// 連続DB失敗のカウンタ（DB障害時の無駄なリトライを防止）
	// 連続で maxConsecutiveFailures 回失敗したら早期打ち切りする
	const maxConsecutiveFailures = 3
	consecutiveFailures := 0

	// 2. 各アイテムを処理
	for _, item := range items {
		// タイトルのバリデーション（Create メソッドと同じルール）
		title := strings.TrimSpace(item.Title)
		if title == "" {
			result.SkippedCount++
			continue
		}

		// GUID がないアイテムはスキップ（重複検知ができないため）
		if item.GUID == "" {
			result.SkippedCount++
			continue
		}

		// GUID で既存チェック
		existing, err := u.episodeRepo.GetByGUID(ctx, podcastID, item.GUID)
		if err != nil {
			log.Printf("[FetchFromFeed] failed to check GUID %q for podcast %s: %v", item.GUID, podcastID, err)
			result.FailedCount++
			consecutiveFailures++
			if consecutiveFailures >= maxConsecutiveFailures {
				log.Printf("[FetchFromFeed] aborting: %d consecutive DB failures for podcast %s", consecutiveFailures, podcastID)
				return result, fmt.Errorf("aborting fetch: %d consecutive database failures", consecutiveFailures)
			}
			continue
		}
		// DB 成功したのでカウンタリセット
		consecutiveFailures = 0

		if existing != nil {
			// 既に登録済み
			result.SkippedCount++
			continue
		}

		// 3. 新規エピソードを構築して保存
		episode := &model.Episode{
			ID:         uuid.New(),
			PodcastID:  podcastID,
			GUID:       &item.GUID,
			Title:      title,
			AudioURL:   strPtr(item.AudioURL),
			ArtworkURL: strPtr(item.ImageURL),
			SourceURL:  strPtr(item.Link),
			DurationMs: item.DurationMs,
			PublishedAt: item.PubDate,
		}

		// Description はポインタで保持
		if item.Description != "" {
			episode.Description = &item.Description
		}

		if err := u.episodeRepo.Create(ctx, episode); err != nil {
			// UNIQUE 違反の場合はスキップ（並行リクエストで先に INSERT されたケース）
			if isUniqueViolation(err) {
				result.SkippedCount++
				consecutiveFailures = 0
				continue
			}
			log.Printf("[FetchFromFeed] failed to create episode %q (GUID: %s) for podcast %s: %v", title, item.GUID, podcastID, err)
			result.FailedCount++
			consecutiveFailures++
			if consecutiveFailures >= maxConsecutiveFailures {
				log.Printf("[FetchFromFeed] aborting: %d consecutive DB failures for podcast %s", consecutiveFailures, podcastID)
				return result, fmt.Errorf("aborting fetch: %d consecutive database failures", consecutiveFailures)
			}
			continue
		}

		// DB 成功したのでカウンタリセット
		consecutiveFailures = 0
		result.NewCount++
		result.Episodes = append(result.Episodes, *episode)
	}

	return result, nil
}
