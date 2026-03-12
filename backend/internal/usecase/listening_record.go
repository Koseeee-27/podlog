package usecase

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/model"
	"github.com/kobayashikosei/podlog/backend/internal/repository"
)

// ListeningRecordUsecase は聴取記録に関するビジネスロジックです。
type ListeningRecordUsecase interface {
	Create(ctx context.Context, userID, episodeID uuid.UUID) (*model.ListeningRecord, error)
	Delete(ctx context.Context, userID, episodeID uuid.UUID) error
	GetStatus(ctx context.Context, userID, episodeID uuid.UUID) (bool, *model.ListeningRecord, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) (*ListeningRecordListResult, error)
	GetByUsername(ctx context.Context, username string, limit, offset int) (*ListeningRecordListResult, error)
}

// ListeningRecordListResult は聴取履歴一覧のレスポンスを表す構造体です。
type ListeningRecordListResult struct {
	Records []ListeningRecordItem `json:"records"`
	Total   int                   `json:"total"`
}

// ListeningRecordItem は聴取履歴一覧の各レコードです。
type ListeningRecordItem struct {
	ID      uuid.UUID                    `json:"id"`
	Episode ListeningRecordEpisodeInfo   `json:"episode"`
	Podcast ListeningRecordPodcastInfo   `json:"podcast"`
	CreatedAt string                     `json:"created_at"`
}

// ListeningRecordEpisodeInfo は聴取履歴で返すエピソード情報です。
type ListeningRecordEpisodeInfo struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	PodcastID   uuid.UUID `json:"podcast_id"`
	ArtworkURL  *string   `json:"artwork_url,omitempty"`
	PublishedAt *string   `json:"published_at,omitempty"`
}

// ListeningRecordPodcastInfo は聴取履歴で返すポッドキャスト情報です。
type ListeningRecordPodcastInfo struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	ArtworkURL *string   `json:"artwork_url,omitempty"`
}

type listeningRecordUsecase struct {
	recordRepo  repository.ListeningRecordRepository
	episodeRepo repository.EpisodeRepository
	userRepo    repository.UserRepository
}

// NewListeningRecordUsecase は ListeningRecordUsecase の新しいインスタンスを生成します。
// episodeRepo はエピソードの存在チェック、userRepo はユーザーの存在チェックに使用します。
func NewListeningRecordUsecase(
	recordRepo repository.ListeningRecordRepository,
	episodeRepo repository.EpisodeRepository,
	userRepo repository.UserRepository,
) ListeningRecordUsecase {
	return &listeningRecordUsecase{
		recordRepo:  recordRepo,
		episodeRepo: episodeRepo,
		userRepo:    userRepo,
	}
}

// Create は聴取記録を追加します。
//
// 処理の流れ:
//  1. エピソードの存在チェック
//  2. 既に記録済みかチェック → 409 Conflict
//  3. 聴取記録を作成
//  4. UNIQUE 違反の場合は 409 を返す（並行リクエスト対応）
func (u *listeningRecordUsecase) Create(ctx context.Context, userID, episodeID uuid.UUID) (*model.ListeningRecord, error) {
	// 1. エピソードの存在チェック
	episode, err := u.episodeRepo.GetByID(ctx, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to check episode: %w", err)
	}
	if episode == nil {
		return nil, &NotFoundError{Resource: "episode"}
	}

	// 2. 既に記録済みかチェック
	existing, err := u.recordRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing record: %w", err)
	}
	if existing != nil {
		return nil, &ConflictError{Message: "already listened"}
	}

	// 3. 聴取記録を作成
	record := &model.ListeningRecord{
		ID:        uuid.New(),
		UserID:    userID,
		EpisodeID: episodeID,
	}

	if err := u.recordRepo.Create(ctx, record); err != nil {
		// 4. UNIQUE 違反は 409 として扱う（並行リクエスト対応）
		if isUniqueViolation(err) {
			return nil, &ConflictError{Message: "already listened"}
		}
		return nil, fmt.Errorf("failed to create listening record: %w", err)
	}

	// DB の created_at を正確に返すために再取得する
	created, err := u.recordRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get created record: %w", err)
	}

	return created, nil
}

// Delete は聴取記録を削除します。
func (u *listeningRecordUsecase) Delete(ctx context.Context, userID, episodeID uuid.UUID) error {
	err := u.recordRepo.Delete(ctx, userID, episodeID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &NotFoundError{Resource: "listening record"}
		}
		return fmt.Errorf("failed to delete listening record: %w", err)
	}
	return nil
}

// GetStatus はユーザーがそのエピソードを聴いたかどうかを返します。
func (u *listeningRecordUsecase) GetStatus(ctx context.Context, userID, episodeID uuid.UUID) (bool, *model.ListeningRecord, error) {
	record, err := u.recordRepo.GetByUserAndEpisode(ctx, userID, episodeID)
	if err != nil {
		return false, nil, fmt.Errorf("failed to get listening status: %w", err)
	}
	if record == nil {
		return false, nil, nil
	}
	return true, record, nil
}

// toListeningRecordItems は repository.ListeningRecordRow のスライスを
// usecase のレスポンス構造体に変換する共通関数です。
func toListeningRecordItems(rows []repository.ListeningRecordRow) []ListeningRecordItem {
	items := make([]ListeningRecordItem, 0, len(rows))
	for _, row := range rows {
		var publishedAt *string
		if row.PublishedAt != nil {
			s := row.PublishedAt.Format("2006-01-02T15:04:05Z07:00")
			publishedAt = &s
		}

		items = append(items, ListeningRecordItem{
			ID: row.ID,
			Episode: ListeningRecordEpisodeInfo{
				ID:          row.EpisodeID,
				Title:       row.EpisodeTitle,
				PodcastID:   row.PodcastID,
				ArtworkURL:  row.EpisodeArtworkURL,
				PublishedAt: publishedAt,
			},
			Podcast: ListeningRecordPodcastInfo{
				ID:         row.PodcastID,
				Title:      row.PodcastTitle,
				ArtworkURL: row.PodcastArtworkURL,
			},
			CreatedAt: row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	return items
}

// GetByUserID はユーザーの聴取履歴一覧を取得します。
func (u *listeningRecordUsecase) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) (*ListeningRecordListResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	rows, total, err := u.recordRepo.GetByUserID(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get listening records: %w", err)
	}

	return &ListeningRecordListResult{
		Records: toListeningRecordItems(rows),
		Total:   total,
	}, nil
}

// GetByUsername はユーザー名を指定して公開の聴取履歴一覧を取得します。
// userRepo.GetByUsername() で取得した user.ID を使い、既存の recordRepo.GetByUserID() を再利用します。
// ユーザーが存在しない場合は NotFoundError を返します。
func (u *listeningRecordUsecase) GetByUsername(ctx context.Context, username string, limit, offset int) (*ListeningRecordListResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// ユーザーの存在チェック & ID 取得
	user, err := u.userRepo.GetByUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	if user == nil {
		return nil, &NotFoundError{Resource: "user"}
	}

	// 取得した user.ID を使って既存の GetByUserID を再利用
	rows, total, err := u.recordRepo.GetByUserID(ctx, user.ID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get listening records: %w", err)
	}

	return &ListeningRecordListResult{
		Records: toListeningRecordItems(rows),
		Total:   total,
	}, nil
}

