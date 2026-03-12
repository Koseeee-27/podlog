package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// FavoritePodcastRepository は好きな番組データへのアクセスを提供します。
type FavoritePodcastRepository interface {
	// GetByUsername はユーザー名を指定して好きな番組一覧を取得します。
	// favorite_podcasts を users・podcasts と JOIN し、position 順で返します。
	GetByUsername(ctx context.Context, username string) ([]FavoritePodcastRow, error)

	// ReplaceAll はユーザーの好きな番組を一括更新します。
	// トランザクション内で既存レコードを全削除してから、新しいリストを挿入します。
	// podcastIDs の配列順に position を 0 始まりで設定します。
	ReplaceAll(ctx context.Context, userID uuid.UUID, podcastIDs []uuid.UUID) error

	// GetByUserID はユーザー ID を指定して好きな番組一覧を取得します。
	// 一括更新後のレスポンス返却に使用します。
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]FavoritePodcastRow, error)
}

// FavoritePodcastRow は好きな番組一覧の JOIN 結果です。
// API レスポンスに必要なフィールド（id, title, artwork_url）のみ含みます。
type FavoritePodcastRow struct {
	ID         uuid.UUID `db:"id"`
	Title      string    `db:"title"`
	ArtworkURL *string   `db:"artwork_url"`
}

type favoritePodcastRepository struct {
	db *sqlx.DB
}

// NewFavoritePodcastRepository は FavoritePodcastRepository の新しいインスタンスを生成します。
func NewFavoritePodcastRepository(db *sqlx.DB) FavoritePodcastRepository {
	return &favoritePodcastRepository{db: db}
}

// GetByUsername はユーザー名を指定して好きな番組一覧を取得します。
// SQL の処理:
//  1. favorite_podcasts と users を user_id で JOIN（ユーザー名で絞り込むため）
//  2. favorite_podcasts と podcasts を podcast_id で JOIN（番組情報を取得するため）
//  3. users.deleted_at IS NULL で論理削除済みユーザーを除外
//  4. position ASC で表示順を保持
func (r *favoritePodcastRepository) GetByUsername(ctx context.Context, username string) ([]FavoritePodcastRow, error) {
	query := `
		SELECT
			p.id,
			p.title,
			p.artwork_url
		FROM favorite_podcasts fp
		JOIN users u ON fp.user_id = u.id
		JOIN podcasts p ON fp.podcast_id = p.id
		WHERE u.username = $1 AND u.deleted_at IS NULL
		ORDER BY fp.position ASC
	`
	var rows []FavoritePodcastRow
	if err := r.db.SelectContext(ctx, &rows, query, username); err != nil {
		return nil, fmt.Errorf("failed to get favorite podcasts by username: %w", err)
	}

	return rows, nil
}

// ReplaceAll はユーザーの好きな番組を一括更新します。
//
// トランザクション内で以下を実行します:
//  1. 該当ユーザーの favorite_podcasts を全て DELETE
//  2. 新しい podcast_ids を position 付きで INSERT
//
// 空の podcastIDs が渡された場合は削除のみ実行します（好きな番組をクリア）。
func (r *favoritePodcastRepository) ReplaceAll(ctx context.Context, userID uuid.UUID, podcastIDs []uuid.UUID) error {
	// トランザクションを開始
	// トランザクションとは、複数のDB操作をひとまとめにして、全て成功 or 全て失敗にする仕組みです。
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	// defer で関数終了時にロールバック。Commit 済みなら何もしない。
	defer tx.Rollback()

	// 1. 既存レコードを全削除
	_, err = tx.ExecContext(ctx, `DELETE FROM favorite_podcasts WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("failed to delete favorite podcasts: %w", err)
	}

	// 2. 新しいリストを挿入（podcastIDs が空なら削除のみで終了）
	if len(podcastIDs) > 0 {
		query := `INSERT INTO favorite_podcasts (id, user_id, podcast_id, position, created_at) VALUES ($1, $2, $3, $4, NOW())`
		for i, podcastID := range podcastIDs {
			_, err = tx.ExecContext(ctx, query, uuid.New(), userID, podcastID, i)
			if err != nil {
				return fmt.Errorf("failed to insert favorite podcast (position %d): %w", i, err)
			}
		}
	}

	// 3. トランザクションをコミット（確定）
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetByUserID はユーザー ID を指定して好きな番組一覧を取得します。
// 一括更新後のレスポンス返却で使用します。GetByUsername と同じ FavoritePodcastRow を返します。
func (r *favoritePodcastRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]FavoritePodcastRow, error) {
	query := `
		SELECT
			p.id,
			p.title,
			p.artwork_url
		FROM favorite_podcasts fp
		JOIN podcasts p ON fp.podcast_id = p.id
		WHERE fp.user_id = $1
		ORDER BY fp.position ASC
	`
	var rows []FavoritePodcastRow
	if err := r.db.SelectContext(ctx, &rows, query, userID); err != nil {
		return nil, fmt.Errorf("failed to get favorite podcasts by user id: %w", err)
	}

	return rows, nil
}
