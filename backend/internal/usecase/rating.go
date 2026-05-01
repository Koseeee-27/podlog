package usecase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// CreateRatingInput は評価投稿のリクエストを表します。
//
// 旧 CreateReviewInput からコメントフィールドを削除した形です。コメント投稿は別エンドポイント
// (`POST /episodes/{id}/comments`) を使用します。
type CreateRatingInput struct {
	Rating int `json:"rating"`
}

// UpdateRatingInput は評価更新のリクエストを表します。
type UpdateRatingInput struct {
	Rating int `json:"rating"`
}

// RatingUsecase は評価に関するビジネスロジックです。
type RatingUsecase interface {
	Create(ctx context.Context, userID, episodeID uuid.UUID, input CreateRatingInput) (*model.Rating, error)
	Update(ctx context.Context, userID, episodeID uuid.UUID, input UpdateRatingInput) (*model.Rating, error)
	Delete(ctx context.Context, userID, episodeID uuid.UUID) error
	GetMyRating(ctx context.Context, userID, episodeID uuid.UUID) (*model.Rating, error)
	GetEpisodeStats(ctx context.Context, episodeID uuid.UUID) (*EpisodeRatingStatsResult, error)
	GetUsernameStats(ctx context.Context, username string) (*UserRatingStatsResult, error)
	GetPodcastRating(ctx context.Context, podcastID uuid.UUID) (*PodcastRatingResult, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) (*MyRatingListResult, error)
}

// EpisodeRatingStatsResult はエピソードの評価集計レスポンスです。
//
// `GET /episodes/{id}/ratings` のレスポンスとして使います。距離（distribution）は API 設計書に
// 合わせて 1〜5 の星別件数を返します。`map[int]int` は Go の encoding/json で
// 文字列キー（`"1"` 〜 `"5"`）に自動変換されます。
type EpisodeRatingStatsResult struct {
	AverageRating float64     `json:"average_rating"`
	TotalRatings  int         `json:"total_ratings"`
	Distribution  map[int]int `json:"distribution"`
}

// UserRatingStatsResult はユーザーの評価統計レスポンスです。
// `GET /users/{username}/ratings/stats` で使用。
type UserRatingStatsResult struct {
	TotalRatings  int         `json:"total_ratings"`
	AverageRating float64     `json:"average_rating"`
	Distribution  map[int]int `json:"distribution"`
}

// PodcastRatingResult はポッドキャストの平均評価レスポンスです。
// `GET /podcasts/{id}/rating` で使用。distribution は不要なので持ちません。
type PodcastRatingResult struct {
	AverageRating float64 `json:"average_rating"`
	TotalRatings  int     `json:"total_ratings"`
}

// MyRatingListResult は自分の評価一覧のレスポンスです。
// `GET /users/me/ratings` で使用。設定ページ等での確認・整理用途。
type MyRatingListResult struct {
	Ratings []MyRatingItem `json:"ratings"`
	Total   int            `json:"total"`
}

// MyRatingItem は自分の評価一覧の各レコードです。
// 旧 UserReviewItem から comment 列を削除した形。
type MyRatingItem struct {
	ID        uuid.UUID         `json:"id"`
	Episode   RatingEpisodeInfo `json:"episode"`
	Podcast   RatingPodcastInfo `json:"podcast"`
	Rating    int               `json:"rating"`
	CreatedAt string            `json:"created_at"`
	UpdatedAt string            `json:"updated_at"`
}

// RatingEpisodeInfo は評価一覧に含まれるエピソード情報です。
type RatingEpisodeInfo struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	PodcastID  uuid.UUID `json:"podcast_id"`
	ArtworkURL *string   `json:"artwork_url,omitempty"`
}

// RatingPodcastInfo は評価一覧に含まれるポッドキャスト情報です。
type RatingPodcastInfo struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	ArtworkURL *string   `json:"artwork_url,omitempty"`
}

type ratingUsecase struct {
	ratingRepo  repository.RatingRepository
	episodeRepo repository.EpisodeRepository
	userRepo    repository.UserRepository
}

// NewRatingUsecase は RatingUsecase の新しいインスタンスを生成します。
// userRepo はユーザー名指定の評価集計（`/users/{username}/ratings/stats`）で
// ユーザー存在チェックに使用します。
func NewRatingUsecase(
	ratingRepo repository.RatingRepository,
	episodeRepo repository.EpisodeRepository,
	userRepo repository.UserRepository,
) RatingUsecase {
	return &ratingUsecase{
		ratingRepo:  ratingRepo,
		episodeRepo: episodeRepo,
		userRepo:    userRepo,
	}
}

// Create は評価を投稿します。
//
// 処理の流れ:
//  1. バリデーション（rating: 1〜5）
//  2. エピソードの存在チェック
//  3. 既に評価済みかチェック → 409 Conflict
//  4. 評価を作成
//  5. 作成後のレコードを再取得して created_at / updated_at を確定値で返す
//
// なお、API 設計書の方針として「POST は冪等にしない（upsert にしない）」
// 既存の評価がある場合は 409 を返し、FE 側で `PUT /episodes/{id}/ratings/mine` に
// フォールバックする運用としている。
func (u *ratingUsecase) Create(ctx context.Context, userID, episodeID uuid.UUID, input CreateRatingInput) (*model.Rating, error) {
	if err := validateRating(input.Rating); err != nil {
		return nil, err
	}

	episode, err := u.episodeRepo.GetByID(ctx, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to check episode: %w", err)
	}
	if episode == nil {
		return nil, &NotFoundError{Resource: "episode"}
	}

	existing, err := u.ratingRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing rating: %w", err)
	}
	if existing != nil {
		return nil, &ConflictError{Message: "rating already exists"}
	}

	rating := &model.Rating{
		ID:        uuid.New(),
		UserID:    userID,
		EpisodeID: episodeID,
		Rating:    input.Rating,
	}

	if err := u.ratingRepo.Create(ctx, rating); err != nil {
		// 並行リクエストで事前チェックをすり抜けた場合、UNIQUE 制約違反 (23505) で
		// 失敗することがある。この場合も Conflict として扱う。
		if isUniqueViolation(err) {
			return nil, &ConflictError{Message: "rating already exists"}
		}
		return nil, fmt.Errorf("failed to create rating: %w", err)
	}

	// DB の created_at / updated_at を正確に返すために再取得する
	created, err := u.ratingRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get created rating: %w", err)
	}
	return created, nil
}

// Update は評価を更新します。
// 既存レコードが無ければ NotFoundError を返します（404 ハンドリング）。
func (u *ratingUsecase) Update(ctx context.Context, userID, episodeID uuid.UUID, input UpdateRatingInput) (*model.Rating, error) {
	if err := validateRating(input.Rating); err != nil {
		return nil, err
	}

	existing, err := u.ratingRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get rating: %w", err)
	}
	if existing == nil {
		return nil, &NotFoundError{Resource: "rating"}
	}

	existing.Rating = input.Rating
	if err := u.ratingRepo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("failed to update rating: %w", err)
	}

	// updated_at を確定値で返すために再取得する
	updated, err := u.ratingRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated rating: %w", err)
	}
	return updated, nil
}

// Delete は評価を削除します。
// 同一ユーザーが投稿した感想（comments）には影響しません（仕様）。
func (u *ratingUsecase) Delete(ctx context.Context, userID, episodeID uuid.UUID) error {
	err := u.ratingRepo.Delete(ctx, userID, episodeID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &NotFoundError{Resource: "rating"}
		}
		return fmt.Errorf("failed to delete rating: %w", err)
	}
	return nil
}

// GetMyRating は指定エピソードに対する自分の評価を取得します。
// 評価未投稿なら NotFoundError を返します（FE は 404 を「未投稿」と解釈）。
func (u *ratingUsecase) GetMyRating(ctx context.Context, userID, episodeID uuid.UUID) (*model.Rating, error) {
	rating, err := u.ratingRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get rating: %w", err)
	}
	if rating == nil {
		return nil, &NotFoundError{Resource: "rating"}
	}
	return rating, nil
}

// GetEpisodeStats はエピソードの評価集計（平均・件数・分布）を取得します。
// `GET /episodes/{id}/ratings` で使用。
func (u *ratingUsecase) GetEpisodeStats(ctx context.Context, episodeID uuid.UUID) (*EpisodeRatingStatsResult, error) {
	avg, total, distribution, err := u.ratingRepo.GetEpisodeStats(ctx, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get episode rating stats: %w", err)
	}
	return &EpisodeRatingStatsResult{
		AverageRating: roundToOneDecimal(avg),
		TotalRatings:  total,
		Distribution:  distribution,
	}, nil
}

// GetUsernameStats はユーザー名で指定したユーザーの評価集計を取得します。
// 該当ユーザーが存在しない（または論理削除済み）場合は NotFoundError を返します。
func (u *ratingUsecase) GetUsernameStats(ctx context.Context, username string) (*UserRatingStatsResult, error) {
	exists, err := u.userRepo.ExistsByUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to check user existence: %w", err)
	}
	if !exists {
		return nil, &NotFoundError{Resource: "user"}
	}

	avg, total, distribution, err := u.ratingRepo.GetUsernameStats(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to get user rating stats: %w", err)
	}

	return &UserRatingStatsResult{
		TotalRatings:  total,
		AverageRating: roundToOneDecimal(avg),
		Distribution:  distribution,
	}, nil
}

// GetPodcastRating はポッドキャストの平均評価と総件数を取得します。
// `GET /podcasts/{id}/rating` で使用。エピソード詳細・番組詳細の集計値補填にも使われる。
func (u *ratingUsecase) GetPodcastRating(ctx context.Context, podcastID uuid.UUID) (*PodcastRatingResult, error) {
	avg, count, err := u.ratingRepo.GetAverageRatingByPodcastID(ctx, podcastID)
	if err != nil {
		return nil, fmt.Errorf("failed to get podcast rating: %w", err)
	}
	return &PodcastRatingResult{
		AverageRating: roundToOneDecimal(avg),
		TotalRatings:  count,
	}, nil
}

// GetByUserID は自分の評価一覧を取得します（`GET /users/me/ratings`）。
// 設定ページ等での確認・整理用途を想定。公開ページでは使用しない。
func (u *ratingUsecase) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) (*MyRatingListResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	rows, total, err := u.ratingRepo.GetByUserID(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get ratings: %w", err)
	}

	items := make([]MyRatingItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, MyRatingItem{
			ID: row.ID,
			Episode: RatingEpisodeInfo{
				ID:         row.EpisodeID,
				Title:      row.EpisodeTitle,
				PodcastID:  row.PodcastID,
				ArtworkURL: row.EpisodeArtworkURL,
			},
			Podcast: RatingPodcastInfo{
				ID:         row.PodcastID,
				Title:      row.PodcastTitle,
				ArtworkURL: row.PodcastArtworkURL,
			},
			Rating:    row.Rating,
			CreatedAt: row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: row.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	return &MyRatingListResult{
		Ratings: items,
		Total:   total,
	}, nil
}

// validateRating は評価値（1〜5）のバリデーションを行います。
// 旧 validateAndTrimReviewInput から comment 検証を取り除いたシンプルな版です。
func validateRating(rating int) error {
	if rating < 1 || rating > 5 {
		return &ValidationError{Message: "rating must be between 1 and 5"}
	}
	return nil
}
