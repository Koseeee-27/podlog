package usecase

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/Koseeee-27/podlog/backend/internal/external/rss"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// maxEpisodesPerFetch は FetchFromFeed で1回に処理するエピソードの上限数です。
// エピソード数が多い番組（数千件）で取得が重くなるのを防ぐため、
// 公開日の新しい順に最新50件のみを DB に保存します。
const maxEpisodesPerFetch = 50

// EpisodeDetailResult はエピソード詳細のレスポンスです。
// API 設計書に従い、エピソード情報に加えて podcast 情報と average_rating / total_reviews を含みます。
// Listened は認証ユーザーの聴取状態です。未認証の場合は omitempty により省略されます。
type EpisodeDetailResult struct {
	ID            uuid.UUID              `json:"id"`
	Title         string                 `json:"title"`
	Description   *string                `json:"description,omitempty"`
	AudioURL      *string                `json:"audio_url,omitempty"`
	ArtworkURL    *string                `json:"artwork_url,omitempty"`
	DurationMs    *int64                 `json:"duration_ms,omitempty"`
	PublishedAt   *string                `json:"published_at,omitempty"`
	Podcast       EpisodePodcastInfo     `json:"podcast"`
	AverageRating float64                `json:"average_rating"`
	TotalReviews  int                    `json:"total_reviews"`
	Listened      *bool                  `json:"listened,omitempty"`
	CreatedAt     string                 `json:"created_at"`
}

// EpisodePodcastInfo はエピソード詳細に含まれるポッドキャスト情報です。
type EpisodePodcastInfo struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	ArtworkURL *string   `json:"artwork_url,omitempty"`
}

// EpisodeListResult はエピソード一覧のレスポンスです。
// API 設計書に従い、各エピソードに average_rating / total_reviews を含み、total を返します。
type EpisodeListResult struct {
	Episodes []EpisodeListItem `json:"episodes"`
	Total    int               `json:"total"`
}

// EpisodeListItem はエピソード一覧の各レコードです。
// Listened は認証ユーザーの聴取状態です。未認証の場合は omitempty により省略されます。
type EpisodeListItem struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	Description   *string   `json:"description,omitempty"`
	DurationMs    *int64    `json:"duration_ms,omitempty"`
	PublishedAt   *string   `json:"published_at,omitempty"`
	AverageRating float64   `json:"average_rating"`
	TotalReviews  int       `json:"total_reviews"`
	Listened      *bool     `json:"listened,omitempty"`
}

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

// RecentEpisodeListResult は記録ページ用の「最近のエピソード」一覧のレスポンスです。
// ユーザーが聴取記録をつけた番組のうち、まだ聴いていないエピソードを番組ごとにグループ化して返します。
// RecordedPodcastCount はユーザーが記録をつけた番組数で、
// 初回利用（0）と「記録はあるが新着なし」を区別するために使います。
type RecentEpisodeListResult struct {
	Podcasts             []RecentPodcastGroup `json:"podcasts"`
	RecordedPodcastCount int                  `json:"recorded_podcast_count"`
}

// RecentPodcastGroup は番組ごとにグループ化された未聴取エピソードです。
// Podcast に番組情報、Episodes にその番組の未聴取エピソード（最新3件）、
// TotalUnlistened にその番組の未聴取エピソード総数を含みます。
type RecentPodcastGroup struct {
	Podcast         EpisodePodcastInfo   `json:"podcast"`
	Episodes        []RecentEpisodeItem  `json:"episodes"`
	TotalUnlistened int                  `json:"total_unlistened"`
}

// RecentEpisodeItem は「最近のエピソード」の各レコードです。
type RecentEpisodeItem struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	Description *string   `json:"description,omitempty"`
	DurationMs  *int64    `json:"duration_ms,omitempty"`
	PublishedAt *string   `json:"published_at,omitempty"`
}

// feedStaleDuration は RSS フィードのキャッシュ有効期間です。
// feed_last_fetched_at からこの時間を超えた場合、バックグラウンドで RSS フィードを再取得します。
const feedStaleDuration = 6 * time.Hour

// EpisodeUsecase はエピソードに関するビジネスロジックです。
type EpisodeUsecase interface {
	Create(ctx context.Context, podcastID uuid.UUID, input CreateEpisodeInput) (*CreateEpisodeResult, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Episode, error)
	GetByPodcastID(ctx context.Context, podcastID uuid.UUID, limit, offset int) ([]model.Episode, error)
	// GetByPodcastIDWithStats はエピソード一覧をレビュー統計付きで取得します。
	// userID が nil でない場合、各エピソードの聴取状態（listened）も含めます。
	GetByPodcastIDWithStats(ctx context.Context, podcastID uuid.UUID, limit, offset int, userID *uuid.UUID) (*EpisodeListResult, error)
	// GetByPodcastIDWithAutoFetch はエピソード一覧を取得し、必要に応じて RSS フィードから自動取得します。
	// userID が nil でない場合、各エピソードの聴取状態（listened）も含めます。
	// Stale-While-Revalidate 方式:
	//   - DB にエピソードが 0 件: 同期的に RSS フィードを取得してから返す
	//   - feed_last_fetched_at から 6 時間経過: バックグラウンドで RSS を再取得
	GetByPodcastIDWithAutoFetch(ctx context.Context, podcastID uuid.UUID, limit, offset int, userID *uuid.UUID) (*EpisodeListResult, error)
	FetchFromFeed(ctx context.Context, podcastID uuid.UUID, feedURL string) (*FetchFromFeedResult, error)
	GetRecentForUser(ctx context.Context, userID uuid.UUID) (*RecentEpisodeListResult, error)
	// IsListened は指定ユーザーが指定エピソードを聴取済みかどうかを返します。
	// エピソード詳細の listened フィールドに使用します。
	IsListened(ctx context.Context, userID uuid.UUID, episodeID uuid.UUID) (bool, error)
}

type episodeUsecase struct {
	episodeRepo    repository.EpisodeRepository
	podcastRepo    repository.PodcastRepository
	rssFetcher     rss.Fetcher
	bgWg           *sync.WaitGroup // バックグラウンド goroutine の追跡用（graceful shutdown）
	fetchInFlight  sync.Map        // 進行中のバックグラウンドフェッチを podcastID で追跡（重複防止）
}

// NewEpisodeUsecase は EpisodeUsecase の新しいインスタンスを生成します。
// podcastRepo は FetchFromFeed 完了後に feed_last_fetched_at を更新するために使います。
// rssFetcher には RSS フィード取得クライアントを渡します。
// bgWg はバックグラウンド goroutine を追跡するための WaitGroup です。
// nil を渡すと goroutine の追跡なしで動作します（テスト用）。
func NewEpisodeUsecase(episodeRepo repository.EpisodeRepository, podcastRepo repository.PodcastRepository, rssFetcher rss.Fetcher, bgWg *sync.WaitGroup) EpisodeUsecase {
	return &episodeUsecase{
		episodeRepo: episodeRepo,
		podcastRepo: podcastRepo,
		rssFetcher:  rssFetcher,
		bgWg:        bgWg,
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

// GetByPodcastIDWithStats はポッドキャストのエピソード一覧をレビュー統計付きで取得します。
// API 設計書に従い、各エピソードに average_rating / total_reviews を含み、total を返します。
// userID が nil でない場合、各エピソードの聴取状態（listened）も含めます。
func (u *episodeUsecase) GetByPodcastIDWithStats(ctx context.Context, podcastID uuid.UUID, limit, offset int, userID *uuid.UUID) (*EpisodeListResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	rows, total, err := u.episodeRepo.GetByPodcastIDWithStats(ctx, podcastID, limit, offset, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get episodes with stats: %w", err)
	}

	items := make([]EpisodeListItem, 0, len(rows))
	for _, row := range rows {
		item := EpisodeListItem{
			ID:            row.ID,
			Title:         row.Title,
			Description:   row.Description,
			DurationMs:    row.DurationMs,
			AverageRating: roundToOneDecimal(row.AverageRating),
			TotalReviews:  row.TotalReviews,
			Listened:      row.Listened,
		}
		if row.PublishedAt != nil {
			formatted := row.PublishedAt.Format("2006-01-02T15:04:05Z07:00")
			item.PublishedAt = &formatted
		}
		items = append(items, item)
	}

	return &EpisodeListResult{
		Episodes: items,
		Total:    total,
	}, nil
}

// GetByPodcastIDWithAutoFetch はエピソード一覧を取得し、必要に応じて RSS フィードから自動取得します。
//
// Stale-While-Revalidate 方式:
//  1. ポッドキャスト情報を取得して feed_url の有無を確認
//  2. DB からエピソード一覧を取得
//  3. feed_url がある場合:
//     - エピソード 0 件 → 同期的に RSS フィードを取得してから返す（初回のみ待ちが発生）
//     - feed_last_fetched_at から feedStaleDuration（6時間）経過 → バックグラウンドで RSS を再取得
func (u *episodeUsecase) GetByPodcastIDWithAutoFetch(ctx context.Context, podcastID uuid.UUID, limit, offset int, userID *uuid.UUID) (*EpisodeListResult, error) {
	// 1. ポッドキャスト情報を取得して feed_url と feed_last_fetched_at を確認する
	podcast, err := u.podcastRepo.GetByID(ctx, podcastID)
	if err != nil {
		return nil, fmt.Errorf("failed to get podcast: %w", err)
	}

	hasFeedURL := podcast != nil && podcast.FeedURL != nil && *podcast.FeedURL != ""

	// 2. DB からエピソード一覧を取得
	result, err := u.GetByPodcastIDWithStats(ctx, podcastID, limit, offset, userID)
	if err != nil {
		return nil, err
	}

	if !hasFeedURL {
		return result, nil
	}

	feedURL := *podcast.FeedURL

	if result.Total == 0 && u.isFeedStale(podcast.FeedLastFetchedAt) {
		// 3a. DB にエピソードが 0 件かつキャッシュが古い → 同期的に RSS フィードを取得してからエピソードを返す
		// feed_last_fetched_at が新しい場合はスキップする（空フィードを何度も取りに行くのを防ぐ）
		_, fetchErr := u.FetchFromFeed(ctx, podcastID, feedURL)
		if fetchErr != nil {
			log.Printf("[GetByPodcastIDWithAutoFetch] failed to fetch feed for podcast %s: %v", podcastID, fetchErr)
			// フェッチ失敗でも空のレスポンスを返す（エラーにはしない）
			return result, nil
		}
		// フェッチ成功 → DB から改めてエピソードを取得して返す
		return u.GetByPodcastIDWithStats(ctx, podcastID, limit, offset, userID)
	}

	if u.isFeedStale(podcast.FeedLastFetchedAt) {
		// 3b. キャッシュが古い → バックグラウンドで RSS を再取得（レスポンスは待たない）
		// sync.Map の LoadOrStore で、同一ポッドキャスト ID に対するフェッチが既に進行中なら
		// goroutine を起動せずスキップする。これにより 1 podcastID につき最大1つの goroutine のみ動く。
		key := podcastID.String()
		if _, alreadyRunning := u.fetchInFlight.LoadOrStore(key, struct{}{}); alreadyRunning {
			log.Printf("[GetByPodcastIDWithAutoFetch] background refresh already in progress for podcast %s, skipping", podcastID)
		} else {
			// リクエストの context はレスポンス送信後にキャンセルされるため、
			// バックグラウンドタスク用に新しい context を生成する（最大60秒のタイムアウト付き）
			bgTask := func() {
				defer u.fetchInFlight.Delete(key)
				bgCtx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
				defer cancel()
				if _, err := u.FetchFromFeed(bgCtx, podcastID, feedURL); err != nil {
					log.Printf("[GetByPodcastIDWithAutoFetch] background refresh failed for podcast %s: %v", podcastID, err)
				}
			}
			// bgWg がある場合は wg.Go() で goroutine を起動し、シャットダウン時に待機可能にする。
			// Go 1.25 の wg.Go() は wg.Add(1) + go func() { defer wg.Done(); ... }() を1行で行う。
			if u.bgWg != nil {
				u.bgWg.Go(bgTask)
			} else {
				go bgTask()
			}
		}
	}

	return result, nil
}

// isFeedStale は feed_last_fetched_at が feedStaleDuration を超えて古いかどうかを判定します。
// feed_last_fetched_at が nil（未取得）の場合も古いと判定します。
func (u *episodeUsecase) isFeedStale(lastFetchedAt *time.Time) bool {
	if lastFetchedAt == nil {
		return true
	}
	return time.Since(*lastFetchedAt) > feedStaleDuration
}

// FetchFromFeed は RSS フィードからエピソードを取得してDBに登録します。
//
// 処理の流れ:
//  1. RSS フィードを取得してパース
//  2. 公開日の新しい順にソートし、最新50件に絞る
//  3. 各アイテムの GUID で重複チェック
//  4. 新規エピソードのみ DB に保存
//  5. UNIQUE 違反はスキップとして扱う（並行リクエスト対応）
func (u *episodeUsecase) FetchFromFeed(ctx context.Context, podcastID uuid.UUID, feedURL string) (*FetchFromFeedResult, error) {
	// 1. RSS フィードを取得
	items, err := u.rssFetcher.Fetch(ctx, feedURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch RSS feed: %w", err)
	}

	// 2. 公開日の新しい順にソートし、最新 maxEpisodesPerFetch 件に絞る
	// sort.SliceStable は元の順序を保ちつつソートする安定ソートです。
	// PubDate が nil（公開日不明）のアイテムは末尾に回します。
	sort.SliceStable(items, func(i, j int) bool {
		// どちらかが nil の場合: nil でない方を前に
		if items[i].PubDate == nil && items[j].PubDate == nil {
			return false // 両方 nil なら元の順序を維持
		}
		if items[i].PubDate == nil {
			return false // i が nil → j を前に
		}
		if items[j].PubDate == nil {
			return true // j が nil → i を前に
		}
		// 両方 nil でない場合: 新しい日付を前に（降順）
		return items[i].PubDate.After(*items[j].PubDate)
	})
	if len(items) > maxEpisodesPerFetch {
		items = items[:maxEpisodesPerFetch]
	}

	result := &FetchFromFeedResult{
		Episodes: make([]model.Episode, 0),
	}

	// 連続DB失敗のカウンタ（DB障害時の無駄なリトライを防止）
	// 連続で maxConsecutiveFailures 回失敗したら早期打ち切りする
	const maxConsecutiveFailures = 3
	consecutiveFailures := 0

	// 3. 各アイテムを処理
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

		// 4. 新規エピソードを構築して保存
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

	// RSS フィード取得が完了したので、feed_last_fetched_at を更新する。
	// エラーが起きてもエピソードの取得自体は成功しているのでログだけ出して無視する。
	if err := u.podcastRepo.UpdateFeedLastFetchedAt(ctx, podcastID); err != nil {
		log.Printf("[FetchFromFeed] failed to update feed_last_fetched_at for podcast %s: %v", podcastID, err)
	}

	return result, nil
}

// GetRecentForUser はユーザーが記録をつけた番組の、まだ聴いていないエピソードを
// 番組ごとにグループ化して取得します。
// 記録ページの「最近のエピソード」表示に使用します。
//
// 処理の流れ:
//  1. リポジトリから番組ごとにグループ化された未聴取エピソード（各番組最大3件）を取得
//  2. フラットな行データを番組ごとにグループ化してレスポンス構造体に変換
//  3. 番組の最新エピソード公開日が新しい順でソート
func (u *episodeUsecase) GetRecentForUser(ctx context.Context, userID uuid.UUID) (*RecentEpisodeListResult, error) {
	// 1. リポジトリから取得
	rows, recordedPodcastCount, err := u.episodeRepo.GetRecentByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent episodes: %w", err)
	}

	// 2. フラットな行データを番組ごとにグループ化
	// Go の map は順序が保証されないので、出現順を別スライスで管理します。
	// podcastOrder は番組IDの出現順を記録し、groupMap は番組IDをキーにグループを保持します。
	groupMap := make(map[uuid.UUID]*RecentPodcastGroup)
	podcastOrder := make([]uuid.UUID, 0)

	for _, row := range rows {
		// エピソードアイテムを構築
		item := RecentEpisodeItem{
			ID:          row.ID,
			Title:       row.Title,
			Description: row.Description,
			DurationMs:  row.DurationMs,
		}
		if row.PublishedAt != nil {
			formatted := row.PublishedAt.Format("2006-01-02T15:04:05Z07:00")
			item.PublishedAt = &formatted
		}

		// 番組グループに追加（まだなければ新規作成）
		group, exists := groupMap[row.PodcastID]
		if !exists {
			group = &RecentPodcastGroup{
				Podcast: EpisodePodcastInfo{
					ID:         row.PodcastID,
					Title:      row.PodcastTitle,
					ArtworkURL: row.PodcastArtwork,
				},
				Episodes:        make([]RecentEpisodeItem, 0, 3),
				TotalUnlistened: row.TotalUnlistened,
			}
			groupMap[row.PodcastID] = group
			podcastOrder = append(podcastOrder, row.PodcastID)
		}
		group.Episodes = append(group.Episodes, item)
	}

	// 3. 番組の最新エピソード公開日が新しい順でソート
	// 各グループの最初のエピソード（= その番組で最も新しいエピソード）の公開日で比較します。
	sort.SliceStable(podcastOrder, func(i, j int) bool {
		gi := groupMap[podcastOrder[i]]
		gj := groupMap[podcastOrder[j]]
		// エピソードが空の場合は末尾に（通常は発生しない）
		if len(gi.Episodes) == 0 {
			return false
		}
		if len(gj.Episodes) == 0 {
			return true
		}
		pi := gi.Episodes[0].PublishedAt
		pj := gj.Episodes[0].PublishedAt
		if pi == nil && pj == nil {
			return false
		}
		if pi == nil {
			return false
		}
		if pj == nil {
			return true
		}
		return *pi > *pj // RFC3339 文字列は辞書順で日付比較が可能
	})

	// ソート済みの順序でグループを組み立て
	podcasts := make([]RecentPodcastGroup, 0, len(podcastOrder))
	for _, pid := range podcastOrder {
		podcasts = append(podcasts, *groupMap[pid])
	}

	return &RecentEpisodeListResult{
		Podcasts:             podcasts,
		RecordedPodcastCount: recordedPodcastCount,
	}, nil
}

// IsListened は指定ユーザーが指定エピソードを聴取済みかどうかを返します。
// エピソード詳細 API で、認証ユーザーの聴取状態を返すために使用します。
func (u *episodeUsecase) IsListened(ctx context.Context, userID uuid.UUID, episodeID uuid.UUID) (bool, error) {
	listened, err := u.episodeRepo.IsListened(ctx, userID, episodeID)
	if err != nil {
		return false, fmt.Errorf("failed to check listened status: %w", err)
	}
	return listened, nil
}
