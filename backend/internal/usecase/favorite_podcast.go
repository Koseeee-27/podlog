package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/repository"
)

// FavoritePodcastUsecase は好きな番組に関するビジネスロジックです。
type FavoritePodcastUsecase interface {
	// GetByUsername はユーザー名を指定して好きな番組一覧を取得します。
	// ユーザーが存在しない場合は NotFoundError を返します。
	GetByUsername(ctx context.Context, username string) (*FavoritePodcastListResult, error)
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
}

// NewFavoritePodcastUsecase は FavoritePodcastUsecase の新しいインスタンスを生成します。
// userRepo はユーザーの存在チェックに使用します。
func NewFavoritePodcastUsecase(
	favPodcastRepo repository.FavoritePodcastRepository,
	userRepo repository.UserRepository,
) FavoritePodcastUsecase {
	return &favoritePodcastUsecase{
		favPodcastRepo: favPodcastRepo,
		userRepo:       userRepo,
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
	// make で長さ 0、容量 len(rows) のスライスを作成。
	// 空配列の場合も JSON で [] として返されるようにする。
	items := make([]FavoritePodcastItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, FavoritePodcastItem{
			ID:         row.PodcastID,
			Title:      row.Title,
			ArtworkURL: row.ArtworkURL,
		})
	}

	return &FavoritePodcastListResult{
		Podcasts: items,
	}, nil
}
