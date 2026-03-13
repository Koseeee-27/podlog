package usecase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// CreateReviewInput はレビュー作成のリクエストを表します。
type CreateReviewInput struct {
	Rating  int     `json:"rating"`
	Comment *string `json:"comment,omitempty"`
}

// UpdateReviewInput はレビュー更新のリクエストを表します。
type UpdateReviewInput struct {
	Rating  int     `json:"rating"`
	Comment *string `json:"comment,omitempty"`
}

// ReviewUsecase はレビューに関するビジネスロジックです。
type ReviewUsecase interface {
	Create(ctx context.Context, userID, episodeID uuid.UUID, input CreateReviewInput) (*model.Review, error)
	Update(ctx context.Context, userID, episodeID uuid.UUID, input UpdateReviewInput) (*model.Review, error)
	Delete(ctx context.Context, userID, episodeID uuid.UUID) error
	GetMyReview(ctx context.Context, userID, episodeID uuid.UUID) (*MyReviewResult, error)
	GetByEpisodeID(ctx context.Context, episodeID uuid.UUID, limit, offset int) (*ReviewListResult, error)
	GetPodcastRating(ctx context.Context, podcastID uuid.UUID) (*PodcastRatingResult, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) (*UserReviewListResult, error)
	GetByUsername(ctx context.Context, username string, limit, offset int) (*UserReviewListResult, error)
	GetTimeline(ctx context.Context, limit, offset int) (*TimelineResult, error)
}

// MyReviewResult は自分のレビュー取得のレスポンスです。
// API 仕様に従い、user_id や episode_id は含めず、レビュー内容のみ返します。
type MyReviewResult struct {
	ID        uuid.UUID `json:"id"`
	Rating    int       `json:"rating"`
	Comment   *string   `json:"comment,omitempty"`
	CreatedAt string    `json:"created_at"`
	UpdatedAt string    `json:"updated_at"`
}

// ReviewListResult はエピソードのレビュー一覧のレスポンスです。
type ReviewListResult struct {
	Reviews       []ReviewItem `json:"reviews"`
	Total         int          `json:"total"`
	AverageRating float64      `json:"average_rating"`
}

// ReviewItem はレビュー一覧の各レコードです。
type ReviewItem struct {
	ID        uuid.UUID      `json:"id"`
	User      ReviewUserInfo `json:"user"`
	Rating    int            `json:"rating"`
	Comment   *string        `json:"comment,omitempty"`
	CreatedAt string         `json:"created_at"`
}

// ReviewUserInfo はレビューに含まれるユーザー情報です。
type ReviewUserInfo struct {
	ID          uuid.UUID `json:"id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`
}

// PodcastRatingResult はポッドキャストの平均評価レスポンスです。
type PodcastRatingResult struct {
	AverageRating float64 `json:"average_rating"`
	TotalReviews  int     `json:"total_reviews"`
}

// UserReviewListResult はユーザーのレビュー一覧のレスポンスです。
type UserReviewListResult struct {
	Reviews []UserReviewItem `json:"reviews"`
	Total   int              `json:"total"`
}

// UserReviewItem はユーザーのレビュー一覧の各レコードです。
type UserReviewItem struct {
	ID        uuid.UUID             `json:"id"`
	Episode   ReviewEpisodeInfo     `json:"episode"`
	Podcast   ReviewPodcastInfo     `json:"podcast"`
	Rating    int                   `json:"rating"`
	Comment   *string               `json:"comment,omitempty"`
	CreatedAt string                `json:"created_at"`
	UpdatedAt string                `json:"updated_at"`
}

// ReviewEpisodeInfo はレビューに含まれるエピソード情報です。
type ReviewEpisodeInfo struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	PodcastID  uuid.UUID `json:"podcast_id"`
	ArtworkURL *string   `json:"artwork_url,omitempty"`
}

// ReviewPodcastInfo はレビューに含まれるポッドキャスト情報です。
type ReviewPodcastInfo struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	ArtworkURL *string   `json:"artwork_url,omitempty"`
}

// TimelineResult はタイムラインのレスポンスです。
type TimelineResult struct {
	Reviews []TimelineItem `json:"reviews"`
	Total   int            `json:"total"`
}

// TimelineItem はタイムラインの各レコードです。
type TimelineItem struct {
	ID        uuid.UUID         `json:"id"`
	User      ReviewUserInfo    `json:"user"`
	Episode   ReviewEpisodeInfo `json:"episode"`
	Podcast   ReviewPodcastInfo `json:"podcast"`
	Rating    int               `json:"rating"`
	Comment   *string           `json:"comment,omitempty"`
	CreatedAt string            `json:"created_at"`
}

type reviewUsecase struct {
	reviewRepo  repository.ReviewRepository
	episodeRepo repository.EpisodeRepository
	userRepo    repository.UserRepository
}

// NewReviewUsecase は ReviewUsecase の新しいインスタンスを生成します。
// userRepo はユーザー名からの公開レビュー取得時の存在チェックに使用します。
func NewReviewUsecase(
	reviewRepo repository.ReviewRepository,
	episodeRepo repository.EpisodeRepository,
	userRepo repository.UserRepository,
) ReviewUsecase {
	return &reviewUsecase{
		reviewRepo:  reviewRepo,
		episodeRepo: episodeRepo,
		userRepo:    userRepo,
	}
}

// Create はレビューを投稿します。
//
// 処理の流れ:
//  1. バリデーション（rating: 1〜5、comment: 最大1000文字）
//  2. エピソードの存在チェック
//  3. 既にレビュー済みかチェック → 409 Conflict
//  4. レビューを作成
func (u *reviewUsecase) Create(ctx context.Context, userID, episodeID uuid.UUID, input CreateReviewInput) (*model.Review, error) {
	// 1. バリデーション
	if err := validateReviewInput(input.Rating, input.Comment); err != nil {
		return nil, err
	}

	// 2. エピソードの存在チェック
	episode, err := u.episodeRepo.GetByID(ctx, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to check episode: %w", err)
	}
	if episode == nil {
		return nil, &NotFoundError{Resource: "episode"}
	}

	// 3. 既にレビュー済みかチェック
	existing, err := u.reviewRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing review: %w", err)
	}
	if existing != nil {
		return nil, &ConflictError{Message: "review already exists"}
	}

	// 4. レビューを作成
	review := &model.Review{
		ID:        uuid.New(),
		UserID:    userID,
		EpisodeID: episodeID,
		Rating:    input.Rating,
		Comment:   input.Comment,
	}

	if err := u.reviewRepo.Create(ctx, review); err != nil {
		if isUniqueViolation(err) {
			return nil, &ConflictError{Message: "review already exists"}
		}
		return nil, fmt.Errorf("failed to create review: %w", err)
	}

	// DB の created_at / updated_at を正確に返すために再取得する
	created, err := u.reviewRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get created review: %w", err)
	}

	return created, nil
}

// GetMyReview は指定エピソードに対する自分のレビューを取得します。
//
// 処理の流れ:
//  1. リポジトリの GetByUserAndEpisode で該当レビューを検索
//  2. 見つからなければ NotFoundError を返す（フロントは 404 を受け取って「未投稿」と判定）
//  3. 見つかれば MyReviewResult に変換して返す
func (u *reviewUsecase) GetMyReview(ctx context.Context, userID, episodeID uuid.UUID) (*MyReviewResult, error) {
	review, err := u.reviewRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get review: %w", err)
	}
	if review == nil {
		return nil, &NotFoundError{Resource: "review"}
	}

	return &MyReviewResult{
		ID:        review.ID,
		Rating:    review.Rating,
		Comment:   review.Comment,
		CreatedAt: review.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: review.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

// Update はレビューを更新します。
func (u *reviewUsecase) Update(ctx context.Context, userID, episodeID uuid.UUID, input UpdateReviewInput) (*model.Review, error) {
	if err := validateReviewInput(input.Rating, input.Comment); err != nil {
		return nil, err
	}

	existing, err := u.reviewRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get review: %w", err)
	}
	if existing == nil {
		return nil, &NotFoundError{Resource: "review"}
	}

	existing.Rating = input.Rating
	existing.Comment = input.Comment

	if err := u.reviewRepo.Update(ctx, existing); err != nil {
		return nil, fmt.Errorf("failed to update review: %w", err)
	}

	// Update 後のデータを再取得して返す（updated_at を正確に返すため）
	updated, err := u.reviewRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated review: %w", err)
	}

	return updated, nil
}

// Delete はレビューを削除します。
func (u *reviewUsecase) Delete(ctx context.Context, userID, episodeID uuid.UUID) error {
	err := u.reviewRepo.Delete(ctx, userID, episodeID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &NotFoundError{Resource: "review"}
		}
		return fmt.Errorf("failed to delete review: %w", err)
	}
	return nil
}

// GetByEpisodeID はエピソードのレビュー一覧を取得します。
func (u *reviewUsecase) GetByEpisodeID(ctx context.Context, episodeID uuid.UUID, limit, offset int) (*ReviewListResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	rows, total, err := u.reviewRepo.GetByEpisodeID(ctx, episodeID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get reviews: %w", err)
	}

	avg, _, err := u.reviewRepo.GetAverageRatingByEpisodeID(ctx, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get average rating: %w", err)
	}

	items := make([]ReviewItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, ReviewItem{
			ID: row.ID,
			User: ReviewUserInfo{
				ID:          row.UserID,
				Username:    row.Username,
				DisplayName: row.DisplayName,
				AvatarURL:   row.UserAvatarURL,
			},
			Rating:    row.Rating,
			Comment:   row.Comment,
			CreatedAt: row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	return &ReviewListResult{
		Reviews:       items,
		Total:         total,
		AverageRating: roundToOneDecimal(avg),
	}, nil
}

// GetPodcastRating はポッドキャストの平均評価を取得します。
func (u *reviewUsecase) GetPodcastRating(ctx context.Context, podcastID uuid.UUID) (*PodcastRatingResult, error) {
	avg, count, err := u.reviewRepo.GetAverageRatingByPodcastID(ctx, podcastID)
	if err != nil {
		return nil, fmt.Errorf("failed to get podcast rating: %w", err)
	}

	return &PodcastRatingResult{
		AverageRating: roundToOneDecimal(avg),
		TotalReviews:  count,
	}, nil
}

// GetByUserID はユーザーのレビュー一覧を取得します。
func (u *reviewUsecase) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) (*UserReviewListResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	rows, total, err := u.reviewRepo.GetByUserID(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get reviews: %w", err)
	}

	items := make([]UserReviewItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, UserReviewItem{
			ID: row.ID,
			Episode: ReviewEpisodeInfo{
				ID:         row.EpisodeID,
				Title:      row.EpisodeTitle,
				PodcastID:  row.PodcastID,
				ArtworkURL: row.EpisodeArtworkURL,
			},
			Podcast: ReviewPodcastInfo{
				ID:         row.PodcastID,
				Title:      row.PodcastTitle,
				ArtworkURL: row.PodcastArtworkURL,
			},
			Rating:    row.Rating,
			Comment:   row.Comment,
			CreatedAt: row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: row.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	return &UserReviewListResult{
		Reviews: items,
		Total:   total,
	}, nil
}

// GetByUsername はユーザー名を指定して公開のレビュー一覧を取得します。
// ユーザーが存在しない場合は NotFoundError を返します。
func (u *reviewUsecase) GetByUsername(ctx context.Context, username string, limit, offset int) (*UserReviewListResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// ユーザーの存在チェック（全カラム取得不要なので ExistsByUsername を使用）
	exists, err := u.userRepo.ExistsByUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to check user existence: %w", err)
	}
	if !exists {
		return nil, &NotFoundError{Resource: "user"}
	}

	rows, total, err := u.reviewRepo.GetByUsername(ctx, username, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get reviews: %w", err)
	}

	items := make([]UserReviewItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, UserReviewItem{
			ID: row.ID,
			Episode: ReviewEpisodeInfo{
				ID:         row.EpisodeID,
				Title:      row.EpisodeTitle,
				PodcastID:  row.PodcastID,
				ArtworkURL: row.EpisodeArtworkURL,
			},
			Podcast: ReviewPodcastInfo{
				ID:         row.PodcastID,
				Title:      row.PodcastTitle,
				ArtworkURL: row.PodcastArtworkURL,
			},
			Rating:    row.Rating,
			Comment:   row.Comment,
			CreatedAt: row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: row.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	return &UserReviewListResult{
		Reviews: items,
		Total:   total,
	}, nil
}

// GetTimeline は全ユーザーの最新レビューを取得します。
func (u *reviewUsecase) GetTimeline(ctx context.Context, limit, offset int) (*TimelineResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	rows, total, err := u.reviewRepo.GetTimeline(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get timeline: %w", err)
	}

	items := make([]TimelineItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, TimelineItem{
			ID: row.ID,
			User: ReviewUserInfo{
				ID:          row.UserID,
				Username:    row.Username,
				DisplayName: row.DisplayName,
				AvatarURL:   row.UserAvatarURL,
			},
			Episode: ReviewEpisodeInfo{
				ID:         row.EpisodeID,
				Title:      row.EpisodeTitle,
				PodcastID:  row.PodcastID,
				ArtworkURL: row.EpisodeArtworkURL,
			},
			Podcast: ReviewPodcastInfo{
				ID:         row.PodcastID,
				Title:      row.PodcastTitle,
				ArtworkURL: row.PodcastArtworkURL,
			},
			Rating:    row.Rating,
			Comment:   row.Comment,
			CreatedAt: row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	return &TimelineResult{
		Reviews: items,
		Total:   total,
	}, nil
}

// validateReviewInput はレビュー入力のバリデーションを行います。
func validateReviewInput(rating int, comment *string) error {
	if rating < 1 || rating > 5 {
		return &ValidationError{Message: "rating must be between 1 and 5"}
	}
	if comment != nil {
		trimmed := strings.TrimSpace(*comment)
		if len(trimmed) > 1000 {
			return &ValidationError{Message: "comment must be 1000 characters or less"}
		}
	}
	return nil
}

// roundToOneDecimal は小数点第1位に丸めます。
func roundToOneDecimal(v float64) float64 {
	return math.Round(v*10) / 10
}
