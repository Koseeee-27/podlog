package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// PodcastSitemapRow は sitemap 用の podcast 1 行を表します。
// sitemap 生成に必要な最小限のフィールド（id / updated_at）のみ保持します。
type PodcastSitemapRow struct {
	ID        uuid.UUID `db:"id"`
	UpdatedAt time.Time `db:"updated_at"`
}

// EpisodeSitemapRow は sitemap 用の episode 1 行を表します。
type EpisodeSitemapRow struct {
	ID        uuid.UUID `db:"id"`
	UpdatedAt time.Time `db:"updated_at"`
}

// UserSitemapRow は sitemap 用の user 1 行を表します。
// users テーブルでは username が PK 代わりに公開プロフィール URL の識別子として使われるため、
// id ではなく username を返します（FE の sitemap.ts では /users/:username の URL を生成する）。
type UserSitemapRow struct {
	Username  string    `db:"username"`
	UpdatedAt time.Time `db:"updated_at"`
}

// SitemapRepository は sitemap 生成に必要な軽量な全件取得を提供します。
//
// 設計方針:
//   - 全件を 1 クエリで返す（ページングなし）。
//     現状 podcasts 706 件 / episodes 2003 件 / users 数十件と小さいため許容できます。
//     将来 episodes が 10 万件オーダーに増えたら sitemap index 化（分割）を検討する必要があります。
//   - SELECT 対象は「sitemap 生成に必要な最小限のカラム」のみに絞ることで DB 側の I/O を減らします。
//   - ORDER BY updated_at DESC は安定した順序の保証用。FE 側の優先度判断にも使えます。
type SitemapRepository interface {
	// ListPodcasts は全 podcast の id / updated_at を返します。
	ListPodcasts(ctx context.Context) ([]PodcastSitemapRow, error)
	// ListEpisodes は全 episode の id / updated_at を返します。
	ListEpisodes(ctx context.Context) ([]EpisodeSitemapRow, error)
	// ListUsers は全ユーザーの username / updated_at を返します。
	// ソフトデリート済み（deleted_at IS NOT NULL）のユーザーは除外します。
	// プロフィール未作成のユーザーは users テーブルに行自体が存在しないため、
	// 追加の絞り込みは不要です。
	ListUsers(ctx context.Context) ([]UserSitemapRow, error)
}

type sitemapRepository struct {
	db *sqlx.DB
}

// NewSitemapRepository は SitemapRepository の新しいインスタンスを生成します。
func NewSitemapRepository(db *sqlx.DB) SitemapRepository {
	return &sitemapRepository{db: db}
}

// ListPodcasts は全 podcast の id / updated_at を更新日の新しい順で返します。
func (r *sitemapRepository) ListPodcasts(ctx context.Context) ([]PodcastSitemapRow, error) {
	query := `SELECT id, updated_at FROM podcasts ORDER BY updated_at DESC, id`
	var rows []PodcastSitemapRow
	if err := r.db.SelectContext(ctx, &rows, query); err != nil {
		return nil, fmt.Errorf("failed to list podcasts for sitemap: %w", err)
	}
	return rows, nil
}

// ListEpisodes は全 episode の id / updated_at を更新日の新しい順で返します。
func (r *sitemapRepository) ListEpisodes(ctx context.Context) ([]EpisodeSitemapRow, error) {
	query := `SELECT id, updated_at FROM episodes ORDER BY updated_at DESC, id`
	var rows []EpisodeSitemapRow
	if err := r.db.SelectContext(ctx, &rows, query); err != nil {
		return nil, fmt.Errorf("failed to list episodes for sitemap: %w", err)
	}
	return rows, nil
}

// ListUsers は有効な全ユーザーの username / updated_at を更新日の新しい順で返します。
// users.deleted_at IS NULL でソフトデリート済みのユーザーを除外します。
func (r *sitemapRepository) ListUsers(ctx context.Context) ([]UserSitemapRow, error) {
	query := `
		SELECT username, updated_at
		FROM users
		WHERE deleted_at IS NULL
		ORDER BY updated_at DESC, username
	`
	var rows []UserSitemapRow
	if err := r.db.SelectContext(ctx, &rows, query); err != nil {
		return nil, fmt.Errorf("failed to list users for sitemap: %w", err)
	}
	return rows, nil
}
