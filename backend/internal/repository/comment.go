package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/Koseeee-27/podlog/backend/internal/model"
)

// CommentRepository は感想（comments）データへのアクセスを提供します。
//
// rating と異なり 1ユーザー1エピソード=複数件可（unique 制約なし）のため、Create では
// 重複チェックを行いません。Update / Delete は所有者チェックを **usecase 層** で行う設計
// （api-design.md の 403/404 区別に合わせるため、repository は id のみで操作する）。
type CommentRepository interface {
	Create(ctx context.Context, comment *model.Comment) error
	// Update は本文を更新します。所有者チェックは呼び出し元（usecase）で行います。
	// 行が存在しない場合は sql.ErrNoRows を返します。
	Update(ctx context.Context, commentID uuid.UUID, body string) error
	// Delete は感想 1 件を削除します。所有者チェックは呼び出し元（usecase）で行います。
	// 行が存在しない場合は sql.ErrNoRows を返します。
	Delete(ctx context.Context, commentID uuid.UUID) error
	// GetByID は ID で感想を取得します。存在しなければ (nil, nil) を返します（404 判定は呼び出し元の責務）。
	GetByID(ctx context.Context, commentID uuid.UUID) (*model.Comment, error)
	// GetByEpisodeID はエピソードに紐づく感想一覧を user JOIN 付きで返します。
	// 削除済みユーザー（users.deleted_at IS NOT NULL）は除外します。
	GetByEpisodeID(ctx context.Context, episodeID uuid.UUID, limit, offset int) ([]CommentWithUserRow, int, error)
	// GetByUserID は指定ユーザーの感想一覧を episode + podcast JOIN 付きで返します。
	// `GET /users/me/comments` 用。
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]CommentWithDetailsRow, int, error)
	// GetByUsername はユーザー名で指定したユーザーの公開感想一覧を返します。
	// `GET /users/{username}/comments` 用（公開）。
	GetByUsername(ctx context.Context, username string, limit, offset int) ([]CommentWithDetailsRow, int, error)
	// CountByEpisodeID はエピソードの感想件数を返します。
	// 削除済みユーザーの感想は除外します（エピソード詳細の total_comments 集計用）。
	CountByEpisodeID(ctx context.Context, episodeID uuid.UUID) (int, error)
	// GetTimeline は全ユーザーの最新感想を時系列で返します（`GET /timeline` 用）。
	// 削除済みユーザーは除外します。
	GetTimeline(ctx context.Context, limit, offset int) ([]CommentTimelineRow, int, error)
}

// CommentWithUserRow はエピソード詳細の感想一覧で user 情報を含む JOIN 結果です。
type CommentWithUserRow struct {
	ID              uuid.UUID `db:"id"`
	Body            string    `db:"body"`
	CreatedAt       time.Time `db:"created_at"`
	UpdatedAt       time.Time `db:"updated_at"`
	UserID          uuid.UUID `db:"user_id"`
	UserUsername    string    `db:"user_username"`
	UserDisplayName *string   `db:"user_display_name"`
	UserAvatarURL   *string   `db:"user_avatar_url"`
}

// CommentWithDetailsRow はユーザーの感想一覧（自分 / 公開）で episode + podcast JOIN を含む結果です。
type CommentWithDetailsRow struct {
	ID                uuid.UUID `db:"id"`
	Body              string    `db:"body"`
	CreatedAt         time.Time `db:"created_at"`
	UpdatedAt         time.Time `db:"updated_at"`
	EpisodeID         uuid.UUID `db:"episode_id"`
	EpisodeTitle      string    `db:"episode_title"`
	PodcastID         uuid.UUID `db:"podcast_id"`
	EpisodeArtworkURL *string   `db:"episode_artwork_url"`
	PodcastTitle      string    `db:"podcast_title"`
	PodcastArtworkURL *string   `db:"podcast_artwork_url"`
}

// CommentTimelineRow は /timeline 用の JOIN 結果です（user + episode + podcast すべて含む）。
type CommentTimelineRow struct {
	ID                uuid.UUID `db:"id"`
	Body              string    `db:"body"`
	CreatedAt         time.Time `db:"created_at"`
	UpdatedAt         time.Time `db:"updated_at"`
	UserID            uuid.UUID `db:"user_id"`
	UserUsername      string    `db:"user_username"`
	UserDisplayName   *string   `db:"user_display_name"`
	UserAvatarURL     *string   `db:"user_avatar_url"`
	EpisodeID         uuid.UUID `db:"episode_id"`
	EpisodeTitle      string    `db:"episode_title"`
	PodcastID         uuid.UUID `db:"podcast_id"`
	EpisodeArtworkURL *string   `db:"episode_artwork_url"`
	PodcastTitle      string    `db:"podcast_title"`
	PodcastArtworkURL *string   `db:"podcast_artwork_url"`
}

type commentRepository struct {
	db *sqlx.DB
}

// NewCommentRepository は CommentRepository の新しいインスタンスを生成します。
func NewCommentRepository(db *sqlx.DB) CommentRepository {
	return &commentRepository{db: db}
}

// Create は新しい感想を DB に保存します。
//
// rating と異なり 1ユーザー1エピソード=複数件可のため、unique 制約はなく重複チェックも行いません。
// DB 側の `comments_body_length_check` (1〜1000 文字) も usecase 層で事前検証してから到達します。
func (r *commentRepository) Create(ctx context.Context, comment *model.Comment) error {
	query := `
		INSERT INTO comments (id, user_id, episode_id, body)
		VALUES (:id, :user_id, :episode_id, :body)
	`
	_, err := r.db.NamedExecContext(ctx, query, comment)
	if err != nil {
		return fmt.Errorf("failed to create comment: %w", err)
	}
	return nil
}

// Update は感想本文を更新します。
//
// 所有者チェックは usecase 層で行うため、ここでは id のみで UPDATE します。
// `RowsAffected == 0` のとき `sql.ErrNoRows` を返すことで、usecase が「ID で取得 → Update」の
// TOCTOU レースで他者の DELETE が走った場合も整合性を保てるようにしています
// （rating の Update / Delete と同じ流儀）。
func (r *commentRepository) Update(ctx context.Context, commentID uuid.UUID, body string) error {
	query := `
		UPDATE comments
		SET body = $1, updated_at = NOW()
		WHERE id = $2
	`
	result, err := r.db.ExecContext(ctx, query, body, commentID)
	if err != nil {
		return fmt.Errorf("failed to update comment: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// Delete は感想を削除します。
//
// 所有者チェックは usecase 層で行うため、ここでは id のみで DELETE します。
// `RowsAffected == 0` のとき `sql.ErrNoRows` を返します（Update と対称）。
func (r *commentRepository) Delete(ctx context.Context, commentID uuid.UUID) error {
	query := `DELETE FROM comments WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, commentID)
	if err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// GetByID は ID で感想を取得します。存在しない場合は (nil, nil) を返します。
//
// NOTE（論理削除済みユーザーの取り扱い・仕様未確定）:
// 一覧系メソッド（GetByEpisodeID / GetByUsername / GetTimeline / CountByEpisodeID）は
// `users.deleted_at IS NULL` で論理削除済みユーザーの感想を除外しますが、本メソッドは
// users JOIN を行わないため、論理削除済みユーザーの感想も id 一致なら返します。
// 結果として、usecase 層の所有者チェック（`existing.UserID != userID`）では
// 「論理削除済みでも自分の comment なら更新・削除できる」挙動になります
// （一覧から消えた感想を直接 ID 指定で操作できる状態）。
//
// 仕様としてどちらが正しいかは現時点で未確定:
//   - パターン A（自分の comment は削除済みでも操作可）: 自分の過去投稿を整理できる
//   - パターン B（削除済みは誰も触れない）: 論理削除 = 完全凍結として一貫
//
// 論理削除フローを動かす段階で再検討します（フォロー Issue で扱う想定）。
func (r *commentRepository) GetByID(ctx context.Context, commentID uuid.UUID) (*model.Comment, error) {
	var comment model.Comment
	query := `SELECT * FROM comments WHERE id = $1`
	err := r.db.GetContext(ctx, &comment, query, commentID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get comment: %w", err)
	}
	return &comment, nil
}

// GetByEpisodeID はエピソードの感想一覧を user JOIN 付きで取得します。
//
// 削除済みユーザー（users.deleted_at IS NOT NULL）の感想は除外します。
// COUNT クエリも JOIN + WHERE で除外条件を揃えるため、total と取得行が一致します。
func (r *commentRepository) GetByEpisodeID(ctx context.Context, episodeID uuid.UUID, limit, offset int) ([]CommentWithUserRow, int, error) {
	var total int
	countQuery := `
		SELECT COUNT(*)
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.episode_id = $1 AND u.deleted_at IS NULL
	`
	if err := r.db.GetContext(ctx, &total, countQuery, episodeID); err != nil {
		return nil, 0, fmt.Errorf("failed to count comments by episode: %w", err)
	}

	query := `
		SELECT
			c.id,
			c.body,
			c.created_at,
			c.updated_at,
			u.id AS user_id,
			u.username AS user_username,
			u.display_name AS user_display_name,
			u.avatar_url AS user_avatar_url
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.episode_id = $1 AND u.deleted_at IS NULL
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
	`
	var rows []CommentWithUserRow
	if err := r.db.SelectContext(ctx, &rows, query, episodeID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to get comments by episode: %w", err)
	}
	return rows, total, nil
}

// GetByUserID は自分の感想一覧を episode + podcast JOIN 付きで取得します。
//
// `GET /users/me/comments` 用。COUNT は user_id だけで集計してよい（自分のは削除済みでも自分なので
// users JOIN は不要）。1ユーザー1エピソードに複数件あり得るため、結果には episode/podcast の重複が
// 出てもそのまま返します。
func (r *commentRepository) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]CommentWithDetailsRow, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM comments WHERE user_id = $1`
	if err := r.db.GetContext(ctx, &total, countQuery, userID); err != nil {
		return nil, 0, fmt.Errorf("failed to count comments by user: %w", err)
	}

	query := `
		SELECT
			c.id,
			c.body,
			c.created_at,
			c.updated_at,
			e.id AS episode_id,
			e.title AS episode_title,
			e.podcast_id,
			e.artwork_url AS episode_artwork_url,
			p.title AS podcast_title,
			p.artwork_url AS podcast_artwork_url
		FROM comments c
		JOIN episodes e ON c.episode_id = e.id
		JOIN podcasts p ON e.podcast_id = p.id
		WHERE c.user_id = $1
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
	`
	var rows []CommentWithDetailsRow
	if err := r.db.SelectContext(ctx, &rows, query, userID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to get comments by user: %w", err)
	}
	return rows, total, nil
}

// GetByUsername はユーザー名で指定したユーザーの公開感想一覧を取得します。
//
// `GET /users/{username}/comments` 用（公開エンドポイント）。論理削除済みユーザーの感想は
// 表示しないため、users JOIN + deleted_at IS NULL で絞り込みます。usecase 層で
// `ExistsByUsername` の事前チェックも行いますが、ここでも防御的に絞り込みます。
func (r *commentRepository) GetByUsername(ctx context.Context, username string, limit, offset int) ([]CommentWithDetailsRow, int, error) {
	var total int
	countQuery := `
		SELECT COUNT(*)
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE u.username = $1 AND u.deleted_at IS NULL
	`
	if err := r.db.GetContext(ctx, &total, countQuery, username); err != nil {
		return nil, 0, fmt.Errorf("failed to count comments by username: %w", err)
	}

	query := `
		SELECT
			c.id,
			c.body,
			c.created_at,
			c.updated_at,
			e.id AS episode_id,
			e.title AS episode_title,
			e.podcast_id,
			e.artwork_url AS episode_artwork_url,
			p.title AS podcast_title,
			p.artwork_url AS podcast_artwork_url
		FROM comments c
		JOIN users u ON c.user_id = u.id
		JOIN episodes e ON c.episode_id = e.id
		JOIN podcasts p ON e.podcast_id = p.id
		WHERE u.username = $1 AND u.deleted_at IS NULL
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
	`
	var rows []CommentWithDetailsRow
	if err := r.db.SelectContext(ctx, &rows, query, username, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to get comments by username: %w", err)
	}
	return rows, total, nil
}

// CountByEpisodeID はエピソードに紐づく感想件数を返します（total_comments 集計用）。
// 削除済みユーザーの感想は除外します（GetByEpisodeID と同じ条件）。
func (r *commentRepository) CountByEpisodeID(ctx context.Context, episodeID uuid.UUID) (int, error) {
	var count int
	query := `
		SELECT COUNT(*)
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.episode_id = $1 AND u.deleted_at IS NULL
	`
	if err := r.db.GetContext(ctx, &count, query, episodeID); err != nil {
		return 0, fmt.Errorf("failed to count comments: %w", err)
	}
	return count, nil
}

// GetTimeline は全ユーザーの最新感想を時系列（created_at DESC）で取得します。
//
// `GET /timeline` 用。削除済みユーザーは除外します。
// インデックス `idx_comments_created_at`（created_at DESC）を活用するため、JOIN は
// 必要最小限に留めます（users JOIN の deleted_at フィルタが index-only な scan を
// 妨げる可能性はあるが、想定規模では許容範囲）。
func (r *commentRepository) GetTimeline(ctx context.Context, limit, offset int) ([]CommentTimelineRow, int, error) {
	var total int
	countQuery := `
		SELECT COUNT(*)
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE u.deleted_at IS NULL
	`
	if err := r.db.GetContext(ctx, &total, countQuery); err != nil {
		return nil, 0, fmt.Errorf("failed to count timeline: %w", err)
	}

	query := `
		SELECT
			c.id,
			c.body,
			c.created_at,
			c.updated_at,
			u.id AS user_id,
			u.username AS user_username,
			u.display_name AS user_display_name,
			u.avatar_url AS user_avatar_url,
			e.id AS episode_id,
			e.title AS episode_title,
			e.podcast_id,
			e.artwork_url AS episode_artwork_url,
			p.title AS podcast_title,
			p.artwork_url AS podcast_artwork_url
		FROM comments c
		JOIN users u ON c.user_id = u.id
		JOIN episodes e ON c.episode_id = e.id
		JOIN podcasts p ON e.podcast_id = p.id
		WHERE u.deleted_at IS NULL
		ORDER BY c.created_at DESC
		LIMIT $1 OFFSET $2
	`
	var rows []CommentTimelineRow
	if err := r.db.SelectContext(ctx, &rows, query, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("failed to get timeline: %w", err)
	}
	return rows, total, nil
}
