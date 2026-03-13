package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// FavoritePodcastUsecase は好きな番組に関するビジネスロジックです。
type FavoritePodcastUsecase interface {
	// GetByUsername はユーザー名を指定して好きな番組一覧を取得します。
	// ユーザーが存在しない場合は NotFoundError を返します。
	GetByUsername(ctx context.Context, username string) (*FavoritePodcastListResult, error)

	// UpdateFavorites はユーザーの好きな番組を一括更新します。
	// 既存のリストを全て置き換え、更新後のリストを返します。
	// podcast_id が存在しない場合は ValidationError を返します。
	UpdateFavorites(ctx context.Context, userID uuid.UUID, podcastIDs []uuid.UUID) (*FavoritePodcastListResult, error)
}

// UpdateFavoritePodcastsInput は好きな番組一括更新のリクエストボディです。
type UpdateFavoritePodcastsInput struct {
	PodcastIDs []uuid.UUID `json:"podcast_ids"`
}

// FavoritePodcastListResult は好きな番組一覧のレスポンスです。
// API 仕様の { "podcasts": [...] } に対応します。
type FavoritePodcastListResult struct {
	Podcasts []FavoritePodcastItem `json:"podcasts"`
}

// FavoritePodcastItem は好きな番組一覧の各レコードです。
// API 仕様に従い、id, title, artwork_url のみ含みます。
type FavoritePodcastItem struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	ArtworkURL *string   `json:"artwork_url,omitempty"`
}

type favoritePodcastUsecase struct {
	favPodcastRepo repository.FavoritePodcastRepository
	userRepo       repository.UserRepository
	podcastRepo    repository.PodcastRepository
}

// NewFavoritePodcastUsecase は FavoritePodcastUsecase の新しいインスタンスを生成します。
// userRepo はユーザーの存在チェック、podcastRepo は podcast_id の存在確認に使用します。
func NewFavoritePodcastUsecase(
	favPodcastRepo repository.FavoritePodcastRepository,
	userRepo repository.UserRepository,
	podcastRepo repository.PodcastRepository,
) FavoritePodcastUsecase {
	return &favoritePodcastUsecase{
		favPodcastRepo: favPodcastRepo,
		userRepo:       userRepo,
		podcastRepo:    podcastRepo,
	}
}

// GetByUsername はユーザー名を指定して好きな番組一覧を取得します。
//
// 処理の流れ:
//  1. ユーザーの存在チェック（存在しなければ NotFoundError）
//  2. repository から好きな番組一覧を取得
//  3. レスポンス形式に変換して返す
func (u *favoritePodcastUsecase) GetByUsername(ctx context.Context, username string) (*FavoritePodcastListResult, error) {
	// 1. ユーザーの存在チェック
	exists, err := u.userRepo.ExistsByUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to check user existence: %w", err)
	}
	if !exists {
		return nil, &NotFoundError{Resource: "user"}
	}

	// 2. 好きな番組一覧を取得
	rows, err := u.favPodcastRepo.GetByUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("failed to get favorite podcasts: %w", err)
	}

	// 3. レスポンス形式に変換
	return &FavoritePodcastListResult{
		Podcasts: rowsToFavoritePodcastItems(rows),
	}, nil
}

// UpdateFavorites はユーザーの好きな番組を一括更新します。
//
// 処理の流れ:
//  0. プロフィール存在チェック（存在しなければ NotFoundError）
//  1. podcast_id の重複チェック
//  2. podcast_id がDBに存在するかバリデーション
//  3. トランザクションで全削除 → 再挿入
//  4. 更新後のリストを取得して返す
func (u *favoritePodcastUsecase) UpdateFavorites(ctx context.Context, userID uuid.UUID, podcastIDs []uuid.UUID) (*FavoritePodcastListResult, error) {
	// 0. プロフィール存在チェック: ユーザーが users テーブルに存在するか確認
	// プロフィール未作成や削除済みユーザーの場合は NotFoundError を返す
	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check user existence: %w", err)
	}
	if user == nil {
		return nil, &NotFoundError{Resource: "profile"}
	}

	// 1. 重複チェック: 同じ podcast_id が複数指定されていないか
	seen := make(map[uuid.UUID]bool, len(podcastIDs))
	for _, id := range podcastIDs {
		if seen[id] {
			return nil, &ValidationError{Message: fmt.Sprintf("duplicate podcast_id: %s", id)}
		}
		seen[id] = true
	}

	// 2. podcast_id の存在確認（空配列の場合はスキップ）
	if len(podcastIDs) > 0 {
		missingIDs, err := u.podcastRepo.ExistsByIDs(ctx, podcastIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to validate podcast ids: %w", err)
		}
		if len(missingIDs) > 0 {
			return nil, &ValidationError{Message: fmt.Sprintf("podcast not found: %s", missingIDs[0])}
		}
	}

	// 3. 一括更新（トランザクション内で DELETE + INSERT）
	if err := u.favPodcastRepo.ReplaceAll(ctx, userID, podcastIDs); err != nil {
		return nil, fmt.Errorf("failed to update favorite podcasts: %w", err)
	}

	// 4. 更新後のリストを取得して返す
	rows, err := u.favPodcastRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated favorite podcasts: %w", err)
	}

	return &FavoritePodcastListResult{
		Podcasts: rowsToFavoritePodcastItems(rows),
	}, nil
}

// rowsToFavoritePodcastItems は DB の行データをレスポンス用の構造体に変換します。
// make で長さ 0、容量 len(rows) のスライスを作成し、空配列の場合も JSON で [] を返します。
func rowsToFavoritePodcastItems(rows []repository.FavoritePodcastRow) []FavoritePodcastItem {
	items := make([]FavoritePodcastItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, FavoritePodcastItem{
			ID:         row.PodcastID,
			Title:      row.Title,
			ArtworkURL: row.ArtworkURL,
		})
	}
	return items
}
