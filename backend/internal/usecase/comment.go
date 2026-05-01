package usecase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// commentBodyMaxLength は感想本文の最大文字数（UTF-8 のコードポイント数）です。
// DB 側 `comments_body_length_check`（char_length 1〜1000）と整合させます。
// `char_length` は PostgreSQL では文字数（コードポイント）でのカウントなので
// `utf8.RuneCountInString` で揃えます。
const commentBodyMaxLength = 1000

// CreateCommentInput は感想投稿のリクエストを表します。
type CreateCommentInput struct {
	Body string `json:"body"`
}

// UpdateCommentInput は感想更新のリクエストを表します。
type UpdateCommentInput struct {
	Body string `json:"body"`
}

// CommentUsecase は感想に関するビジネスロジックです。
type CommentUsecase interface {
	Create(ctx context.Context, userID, episodeID uuid.UUID, input CreateCommentInput) (*model.Comment, error)
	Update(ctx context.Context, commentID, userID uuid.UUID, input UpdateCommentInput) (*model.Comment, error)
	Delete(ctx context.Context, commentID, userID uuid.UUID) error
	GetByEpisodeID(ctx context.Context, episodeID uuid.UUID, limit, offset int) (*EpisodeCommentListResult, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) (*UserCommentListResult, error)
	GetByUsername(ctx context.Context, username string, limit, offset int) (*UserCommentListResult, error)
	CountByEpisodeID(ctx context.Context, episodeID uuid.UUID) (int, error)
	GetTimeline(ctx context.Context, limit, offset int) (*TimelineResult, error)
}

// EpisodeCommentListResult はエピソード詳細の感想一覧レスポンスです。
// `GET /episodes/{id}/comments` で使用。
type EpisodeCommentListResult struct {
	Comments []EpisodeCommentItem `json:"comments"`
	Total    int                  `json:"total"`
}

// EpisodeCommentItem はエピソード感想一覧の各行です（user 情報を含む）。
type EpisodeCommentItem struct {
	ID        uuid.UUID       `json:"id"`
	User      CommentUserInfo `json:"user"`
	Body      string          `json:"body"`
	CreatedAt string          `json:"created_at"`
	UpdatedAt string          `json:"updated_at"`
}

// CommentUserInfo は感想に紐づくユーザー情報です（公開項目のみ）。
type CommentUserInfo struct {
	ID          uuid.UUID `json:"id"`
	Username    string    `json:"username"`
	DisplayName *string   `json:"display_name,omitempty"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`
}

// UserCommentListResult はユーザーの感想一覧レスポンスです。
// `GET /users/me/comments` / `GET /users/{username}/comments` で使用。
type UserCommentListResult struct {
	Comments []UserCommentItem `json:"comments"`
	Total    int               `json:"total"`
}

// UserCommentItem はユーザー感想一覧の各行です（episode + podcast 情報を含む）。
type UserCommentItem struct {
	ID        uuid.UUID          `json:"id"`
	Episode   CommentEpisodeInfo `json:"episode"`
	Podcast   CommentPodcastInfo `json:"podcast"`
	Body      string             `json:"body"`
	CreatedAt string             `json:"created_at"`
	UpdatedAt string             `json:"updated_at"`
}

// CommentEpisodeInfo は感想一覧に含まれるエピソード情報です。
type CommentEpisodeInfo struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	PodcastID  uuid.UUID `json:"podcast_id"`
	ArtworkURL *string   `json:"artwork_url,omitempty"`
}

// CommentPodcastInfo は感想一覧に含まれるポッドキャスト情報です。
type CommentPodcastInfo struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	ArtworkURL *string   `json:"artwork_url,omitempty"`
}

// TimelineResult は /timeline のレスポンスです。
// 全ユーザーの最新感想を時系列で並べた配列を返します。
type TimelineResult struct {
	Comments []TimelineItem `json:"comments"`
	Total    int            `json:"total"`
}

// TimelineItem は /timeline の各行です（user + episode + podcast すべて含む）。
type TimelineItem struct {
	ID        uuid.UUID          `json:"id"`
	User      CommentUserInfo    `json:"user"`
	Episode   CommentEpisodeInfo `json:"episode"`
	Podcast   CommentPodcastInfo `json:"podcast"`
	Body      string             `json:"body"`
	CreatedAt string             `json:"created_at"`
	UpdatedAt string             `json:"updated_at"`
}

type commentUsecase struct {
	commentRepo repository.CommentRepository
	episodeRepo repository.EpisodeRepository
	userRepo    repository.UserRepository
}

// NewCommentUsecase は CommentUsecase の新しいインスタンスを生成します。
//
// episodeRepo は感想投稿時のエピソード存在チェックに使用します。
// userRepo は `GET /users/{username}/comments` のユーザー存在チェックに使用します
// （論理削除済みユーザーへのアクセスを 404 で弾くため）。
func NewCommentUsecase(
	commentRepo repository.CommentRepository,
	episodeRepo repository.EpisodeRepository,
	userRepo repository.UserRepository,
) CommentUsecase {
	return &commentUsecase{
		commentRepo: commentRepo,
		episodeRepo: episodeRepo,
		userRepo:    userRepo,
	}
}

// Create は感想を投稿します。
//
// 1ユーザー1エピソード=複数件可なので、rating の Create のような既存チェック → 409 はありません。
// 処理の流れ:
//  1. 本文バリデーション（trim 後 1〜1000 文字）
//  2. エピソードの存在チェック → なければ NotFoundError
//  3. INSERT
//  4. 作成後のレコードを再取得して created_at / updated_at を確定値で返す
func (u *commentUsecase) Create(ctx context.Context, userID, episodeID uuid.UUID, input CreateCommentInput) (*model.Comment, error) {
	body, err := validateCommentBody(input.Body)
	if err != nil {
		return nil, err
	}

	episode, err := u.episodeRepo.GetByID(ctx, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to check episode: %w", err)
	}
	if episode == nil {
		return nil, &NotFoundError{Resource: "episode"}
	}

	comment := &model.Comment{
		ID:        uuid.New(),
		UserID:    userID,
		EpisodeID: episodeID,
		Body:      body,
	}

	if err := u.commentRepo.Create(ctx, comment); err != nil {
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}

	// DB の created_at / updated_at を正確に返すために再取得する
	created, err := u.commentRepo.GetByID(ctx, comment.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get created comment: %w", err)
	}
	if created == nil {
		// 通常起こらないが、Create 直後に他者が削除する競合があれば nil になりうる
		return nil, fmt.Errorf("created comment not found unexpectedly")
	}
	return created, nil
}

// Update は感想本文を更新します。
//
// 所有者チェックは usecase 層で実施します（api-design.md の 403/404 区別に従うため）:
//  1. ID で取得
//  2. 存在しなければ NotFoundError → 404
//  3. user_id != 認証ユーザー なら ForbiddenError → 403
//  4. UPDATE 実行（並行 DELETE で空振りした場合は sql.ErrNoRows を NotFoundError に変換）
//  5. 更新後のレコードを再取得して updated_at を確定値で返す
func (u *commentUsecase) Update(ctx context.Context, commentID, userID uuid.UUID, input UpdateCommentInput) (*model.Comment, error) {
	body, err := validateCommentBody(input.Body)
	if err != nil {
		return nil, err
	}

	existing, err := u.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get comment: %w", err)
	}
	if existing == nil {
		return nil, &NotFoundError{Resource: "comment"}
	}
	if existing.UserID != userID {
		return nil, &ForbiddenError{Message: "forbidden"}
	}

	if err := u.commentRepo.Update(ctx, commentID, body); err != nil {
		// 事前 GetByID と Update の間で並行 DELETE が走るレース対策。
		// 「自分の所有 → 自分の DELETE が並行」しか起こらない設計だが、
		// 整合性を担保するため 404 に揃える（rating の Update と同様）。
		if errors.Is(err, sql.ErrNoRows) {
			return nil, &NotFoundError{Resource: "comment"}
		}
		return nil, fmt.Errorf("failed to update comment: %w", err)
	}

	updated, err := u.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated comment: %w", err)
	}
	if updated == nil {
		return nil, &NotFoundError{Resource: "comment"}
	}
	return updated, nil
}

// Delete は感想を削除します。
//
// 所有者チェックは Update と同じく usecase 層で実施。403 / 404 の区別は api-design.md に準拠。
func (u *commentUsecase) Delete(ctx context.Context, commentID, userID uuid.UUID) error {
	existing, err := u.commentRepo.GetByID(ctx, commentID)
	if err != nil {
		return fmt.Errorf("failed to get comment: %w", err)
	}
	if existing == nil {
		return &NotFoundError{Resource: "comment"}
	}
	if existing.UserID != userID {
		return &ForbiddenError{Message: "forbidden"}
	}

	if err := u.commentRepo.Delete(ctx, commentID); err != nil {
		// 並行 DELETE 競合時は 404 として整合性を保つ
		if errors.Is(err, sql.ErrNoRows) {
			return &NotFoundError{Resource: "comment"}
		}
		return fmt.Errorf("failed to delete comment: %w", err)
	}
	return nil
}

// GetByEpisodeID はエピソードの感想一覧を取得します（公開）。
func (u *commentUsecase) GetByEpisodeID(ctx context.Context, episodeID uuid.UUID, limit, offset int) (*EpisodeCommentListResult, error) {
	limit, offset = normalizePagination(limit, offset)

	rows, total, err := u.commentRepo.GetByEpisodeID(ctx, episodeID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get comments by episode: %w", err)
	}

	items := make([]EpisodeCommentItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, EpisodeCommentItem{
			ID: row.ID,
			User: CommentUserInfo{
				ID:          row.UserID,
				Username:    row.UserUsername,
				DisplayName: row.UserDisplayName,
				AvatarURL:   row.UserAvatarURL,
			},
			Body:      row.Body,
			CreatedAt: row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: row.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	return &EpisodeCommentListResult{
		Comments: items,
		Total:    total,
	}, nil
}

// GetByUserID は自分の感想一覧を取得します（`GET /users/me/comments`）。
func (u *commentUsecase) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) (*UserCommentListResult, error) {
	limit, offset = normalizePagination(limit, offset)

	rows, total, err := u.commentRepo.GetByUserID(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get comments by user: %w", err)
	}
	return buildUserCommentListResult(rows, total), nil
}

// GetByUsername は公開感想一覧を取得します（`GET /users/{username}/comments`）。
//
// 論理削除済みユーザーへのアクセスを弾くため、ExistsByUsername で事前チェックします。
// repository 側でも `users.deleted_at IS NULL` で防御的にフィルタするため、TOCTOU レースでも
// 削除済みユーザーの感想は返りません。
func (u *commentUsecase) GetByUsername(ctx context.Context, username string, limit, offset int) (*UserCommentListResult, error) {
	limit, offset = normalizePagination(limit, offset)

	exists, err := u.userRepo.ExistsByUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to check user existence: %w", err)
	}
	if !exists {
		return nil, &NotFoundError{Resource: "user"}
	}

	rows, total, err := u.commentRepo.GetByUsername(ctx, username, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get comments by username: %w", err)
	}
	return buildUserCommentListResult(rows, total), nil
}

// CountByEpisodeID はエピソードの感想件数を返します（エピソード詳細 total_comments 用）。
func (u *commentUsecase) CountByEpisodeID(ctx context.Context, episodeID uuid.UUID) (int, error) {
	count, err := u.commentRepo.CountByEpisodeID(ctx, episodeID)
	if err != nil {
		return 0, fmt.Errorf("failed to count comments: %w", err)
	}
	return count, nil
}

// GetTimeline は全ユーザーの最新感想を時系列で取得します（`GET /timeline`）。
func (u *commentUsecase) GetTimeline(ctx context.Context, limit, offset int) (*TimelineResult, error) {
	limit, offset = normalizePagination(limit, offset)

	rows, total, err := u.commentRepo.GetTimeline(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get timeline: %w", err)
	}

	items := make([]TimelineItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, TimelineItem{
			ID: row.ID,
			User: CommentUserInfo{
				ID:          row.UserID,
				Username:    row.UserUsername,
				DisplayName: row.UserDisplayName,
				AvatarURL:   row.UserAvatarURL,
			},
			Episode: CommentEpisodeInfo{
				ID:         row.EpisodeID,
				Title:      row.EpisodeTitle,
				PodcastID:  row.PodcastID,
				ArtworkURL: row.EpisodeArtworkURL,
			},
			Podcast: CommentPodcastInfo{
				ID:         row.PodcastID,
				Title:      row.PodcastTitle,
				ArtworkURL: row.PodcastArtworkURL,
			},
			Body:      row.Body,
			CreatedAt: row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: row.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	return &TimelineResult{
		Comments: items,
		Total:    total,
	}, nil
}

// validateCommentBody は感想本文をバリデーション + トリミングします。
//
// 仕様:
//   - 前後の空白は trim する（DB に保存する値）
//   - trim 後に空文字なら ValidationError
//   - 1〜1000 文字（コードポイント数）でなければ ValidationError
//   - DB 側の `comments_body_length_check` (char_length 1〜1000) と整合
func validateCommentBody(raw string) (string, error) {
	body := strings.TrimSpace(raw)
	if body == "" {
		return "", &ValidationError{Message: "body must be 1-1000 characters"}
	}
	if utf8.RuneCountInString(body) > commentBodyMaxLength {
		return "", &ValidationError{Message: "body must be 1-1000 characters"}
	}
	return body, nil
}

// normalizePagination は limit/offset を仕様の範囲に丸めます（rating 等の他 usecase と同様）。
func normalizePagination(limit, offset int) (int, int) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

// buildUserCommentListResult は GetByUserID / GetByUsername の共通レスポンス組み立てです。
func buildUserCommentListResult(rows []repository.CommentWithDetailsRow, total int) *UserCommentListResult {
	items := make([]UserCommentItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, UserCommentItem{
			ID: row.ID,
			Episode: CommentEpisodeInfo{
				ID:         row.EpisodeID,
				Title:      row.EpisodeTitle,
				PodcastID:  row.PodcastID,
				ArtworkURL: row.EpisodeArtworkURL,
			},
			Podcast: CommentPodcastInfo{
				ID:         row.PodcastID,
				Title:      row.PodcastTitle,
				ArtworkURL: row.PodcastArtworkURL,
			},
			Body:      row.Body,
			CreatedAt: row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: row.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	return &UserCommentListResult{
		Comments: items,
		Total:    total,
	}
}
