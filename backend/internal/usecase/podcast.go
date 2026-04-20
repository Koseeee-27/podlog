package usecase

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/external/itunes"
	"github.com/Koseeee-27/podlog/backend/internal/model"
	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// PodcastDetailResult はポッドキャスト詳細のレスポンスです。
// API 設計書に従い、番組情報に加えて average_rating / total_reviews を含みます。
type PodcastDetailResult struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	Author        *string   `json:"author,omitempty"`
	Description   *string   `json:"description,omitempty"`
	ArtworkURL    *string   `json:"artwork_url,omitempty"`
	Genre         *string   `json:"genre,omitempty"`
	FeedURL       *string   `json:"feed_url,omitempty"`
	AverageRating float64   `json:"average_rating"`
	TotalReviews  int       `json:"total_reviews"`
	FavoriteCount int       `json:"favorite_count"`
	CreatedAt     string    `json:"created_at"`
}

// PodcastSearchResult は番組検索のレスポンスです。
type PodcastSearchResult struct {
	Podcasts []PodcastSearchItem `json:"podcasts"`
	Total    int                 `json:"total"`
}

// PodcastSearchItem は番組検索結果の各レコードです。
// API 設計書に従い、id / title / author / artwork_url / average_rating / total_reviews を含みます。
type PodcastSearchItem struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	Author        *string   `json:"author,omitempty"`
	ArtworkURL    *string   `json:"artwork_url,omitempty"`
	AverageRating float64   `json:"average_rating"`
	TotalReviews  int       `json:"total_reviews"`
	FavoriteCount int       `json:"favorite_count"`
}

// CreatePodcastInput は番組手動登録のリクエストを表します。
// 管理用 API からポッドキャストを直接登録する際に使います。
// feed_url がない番組（Spotify 独占等）も登録できるように、FeedURL はオプションです。
type CreatePodcastInput struct {
	Title       string  `json:"title"`
	Author      *string `json:"author,omitempty"`
	ArtworkURL  *string `json:"artwork_url,omitempty"`
	Description *string `json:"description,omitempty"`
	Genre       *string `json:"genre,omitempty"`
}

// PodcastUsecase はポッドキャストに関するビジネスロジックです。
type PodcastUsecase interface {
	Create(ctx context.Context, input CreatePodcastInput) (*model.Podcast, error)
	Search(ctx context.Context, query string, genre string, limit, offset int) (*PodcastSearchResult, error)
	GetPopular(ctx context.Context, limit int) (*PodcastSearchResult, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Podcast, error)
}

type podcastUsecase struct {
	podcastRepo  repository.PodcastRepository
	itunesClient *itunes.Client // iTunes API クライアント（nil の場合はフォールバック無効）
}

// NewPodcastUsecase は PodcastUsecase の新しいインスタンスを生成します。
// itunesClient を渡すと、DB 検索の結果が少ない場合に iTunes API でフォールバック検索を行います。
// nil を渡すとフォールバックは無効になります（テスト時など）。
func NewPodcastUsecase(podcastRepo repository.PodcastRepository, itunesClient *itunes.Client) PodcastUsecase {
	return &podcastUsecase{
		podcastRepo:  podcastRepo,
		itunesClient: itunesClient,
	}
}

// Create は新しいポッドキャストを作成して DB に保存します。
// 管理者が RSS フィードのない番組（Spotify 独占等）を手動登録する際に使います。
//
// 処理の流れ:
//  1. タイトルの必須チェック
//  2. UUID を生成してモデルを構築（source_type は "manual" に設定）
//  3. リポジトリ経由で DB に保存
func (u *podcastUsecase) Create(ctx context.Context, input CreatePodcastInput) (*model.Podcast, error) {
	// 1. バリデーション: タイトルは必須
	input.Title = strings.TrimSpace(input.Title)
	if input.Title == "" {
		return nil, &ValidationError{Message: "title is required"}
	}

	// 2. ポッドキャストモデルを構築
	// source_type を "manual" に設定して、手動登録であることを記録します。
	// これにより iTunes API 経由で登録された番組と区別できます。
	podcast := &model.Podcast{
		ID:          uuid.New(),
		Title:       input.Title,
		Author:      input.Author,
		ArtworkURL:  input.ArtworkURL,
		Description: input.Description,
		Genre:       input.Genre,
		SourceType:  "manual",
	}

	// 3. DB に保存
	if err := u.podcastRepo.Create(ctx, podcast); err != nil {
		return nil, err
	}

	// 4. DB から読み直して created_at / updated_at を含む完全なデータを返す
	created, err := u.podcastRepo.GetByID(ctx, podcast.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve created podcast: %w", err)
	}

	return created, nil
}

// Search はアプリ内 DB でポッドキャストをキーワード検索します。
//
// genre パラメータが指定された場合、ExpandGenre を使って親カテゴリに属する
// 全サブカテゴリに展開してから検索します。
// 例: genre="Comedy" → ["Comedy", "Comedy Fiction", "Comedy Interviews", "Improv", "Stand-Up"]
// これにより、フロントエンドが親カテゴリ「コメディ」を選択したとき、
// サブカテゴリの番組も全てヒットします。
func (u *podcastUsecase) Search(ctx context.Context, query string, genre string, limit, offset int) (*PodcastSearchResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// genre が指定されている場合、親カテゴリに属するサブカテゴリ一覧に展開します。
	// genre が空の場合は空スライスを渡し、ジャンル絞り込みなしで検索します。
	var genres []string
	if genre != "" {
		genres = ExpandGenre(genre)
	}

	rows, total, err := u.podcastRepo.Search(ctx, query, genres, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to search podcasts: %w", err)
	}

	items := make([]PodcastSearchItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, PodcastSearchItem{
			ID:            row.ID,
			Title:         row.Title,
			Author:        row.Author,
			ArtworkURL:    row.ArtworkURL,
			AverageRating: roundToOneDecimal(row.AverageRating),
			TotalReviews:  row.TotalReviews,
			FavoriteCount: row.FavoriteCount,
		})
	}

	// ── iTunes API フォールバック ──
	// 条件: キーワード検索あり && DB 結果が 3 件以下 && 最初のページ && iTunes クライアントが有効
	// DB にまだ登録されていない番組を iTunes から取得して補完します。
	if query != "" && total <= 3 && offset == 0 && u.itunesClient != nil {
		itunesResults, itunesErr := u.itunesClient.SearchPodcasts(ctx, query, 10)
		if itunesErr != nil {
			// iTunes API のエラーはログに記録するが、DB の結果だけ返す（ユーザーには影響させない）
			log.Printf("iTunes API フォールバック検索でエラー: %v", itunesErr)
		} else {
			// existingIDsToFill には「DB 既存だが今回の検索にヒットしていない」既存番組の ID を集めます。
			// ループ後に GetByIDsWithStats で集計値を 1 クエリでまとめて取得し、
			// items に積んだプレースホルダ（集計値ゼロ）を上書きします。
			// これにより N 件分の番組を 1 回の DB 呼び出しで補えます（N+1 回避）。
			var existingIDsToFill []uuid.UUID

			// DB に既存の itunes_id を集めて、重複チェックに使う
			// （DB 検索結果の番組は itunes_id を持っていない場合もあるため、
			//   iTunes の結果ごとに DB を確認する）
			for _, result := range itunesResults {
				// DB に同じ itunes_id の番組が既に存在するか確認
				existing, getErr := u.podcastRepo.GetByItunesID(ctx, result.CollectionID)
				if getErr != nil {
					log.Printf("iTunes フォールバック: GetByItunesID エラー (itunesID=%d): %v", result.CollectionID, getErr)
					continue
				}
				if existing != nil {
					// 既に DB にある番組 → DB キーワード検索の結果に含まれているか確認
					alreadyInResults := false
					for _, item := range items {
						if item.ID == existing.ID {
							alreadyInResults = true
							break
						}
					}
					if alreadyInResults {
						continue
					}
					// DB に存在するが今回のキーワード検索にヒットしなかった場合は結果に追加。
					// AverageRating / TotalReviews / FavoriteCount は意図的に省略し
					// （Go のゼロ値 0 がプレースホルダ）、後続の GetByIDsWithStats で
					// 取得した DB 集計値で上書きします。
					items = append(items, PodcastSearchItem{
						ID:         existing.ID,
						Title:      existing.Title,
						Author:     existing.Author,
						ArtworkURL: existing.ArtworkURL,
					})
					existingIDsToFill = append(existingIDsToFill, existing.ID)
					continue
				}

				// iTunes の検索結果から Podcast モデルを構築して DB に保存
				newPodcast := itunesResultToPodcast(result)
				if createErr := u.podcastRepo.Create(ctx, newPodcast); createErr != nil {
					log.Printf("iTunes フォールバック: 番組保存エラー (title=%q): %v", result.CollectionName, createErr)
					continue
				}

				// 保存成功した番組を検索結果に追加
				// 新規番組なのでレビュー・お気に入りは 0
				items = append(items, PodcastSearchItem{
					ID:            newPodcast.ID,
					Title:         newPodcast.Title,
					Author:        newPodcast.Author,
					ArtworkURL:    newPodcast.ArtworkURL,
					AverageRating: 0,
					TotalReviews:  0,
					FavoriteCount: 0,
				})
			}

			// 既存番組（DB 検索にヒットしなかった分）の集計値を 1 クエリで取得して埋める。
			// 該当 ID が無い場合は呼び出さず、無駄な DB アクセスを避けます。
			if len(existingIDsToFill) > 0 {
				statsByID, statsErr := u.podcastRepo.GetByIDsWithStats(ctx, existingIDsToFill)
				if statsErr != nil {
					// 集計値の取得失敗は致命的ではないため、ログのみ出してプレースホルダ（0）のまま続行します。
					// API の応答自体は維持し、ユーザー体験を守る判断です。
					log.Printf("iTunes フォールバック: GetByIDsWithStats エラー: %v", statsErr)
				} else {
					// 取得できた集計値で items を上書きします。
					// items 全件をスキャンし、statsByID に該当 ID があるレコードのみ更新します。
					// items の最大長は「DB ヒット 3 + iTunes 10 = 13 件」と小さいため、
					// O(N×1) の lookup で十分（map 参照は O(1)）。
					// なお DB 検索ヒット経路で取得済みの番組（roundToOneDecimal 適用済み）は
					// statsByID に含まれないため、上書きされず元の値が保持されます。
					for i := range items {
						if row, ok := statsByID[items[i].ID]; ok {
							items[i].AverageRating = roundToOneDecimal(row.AverageRating)
							items[i].TotalReviews = row.TotalReviews
							items[i].FavoriteCount = row.FavoriteCount
						}
					}
				}
			}

			// total を更新（DB の件数 + iTunes から追加した件数）
			total = len(items)
		}
	}

	return &PodcastSearchResult{
		Podcasts: items,
		Total:    total,
	}, nil
}

// itunesResultToPodcast は iTunes API の検索結果を Podcast モデルに変換します。
// ポインタ型のフィールドは、値がある場合のみセットします。
func itunesResultToPodcast(result itunes.SearchResult) *model.Podcast {
	podcast := &model.Podcast{
		ID:         uuid.New(),
		ItunesID:   &result.CollectionID,
		Title:      result.CollectionName,
		SourceType: "itunes",
	}

	// 空文字でないフィールドだけポインタにセットする
	if result.ArtistName != "" {
		podcast.Author = &result.ArtistName
	}
	if result.FeedURL != "" {
		podcast.FeedURL = &result.FeedURL
	}
	if result.ArtworkURL600 != "" {
		podcast.ArtworkURL = &result.ArtworkURL600
	}
	if result.CollectionURL != "" {
		podcast.ItunesURL = &result.CollectionURL
	}
	if result.PrimaryGenre != "" {
		podcast.Genre = &result.PrimaryGenre
	}

	return podcast
}

// GetPopular はレビュー件数の多い人気番組を取得します。
func (u *podcastUsecase) GetPopular(ctx context.Context, limit int) (*PodcastSearchResult, error) {
	if limit <= 0 {
		limit = 10
	} else if limit > 50 {
		limit = 50
	}

	rows, err := u.podcastRepo.GetPopular(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get popular podcasts: %w", err)
	}

	items := make([]PodcastSearchItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, PodcastSearchItem{
			ID:            row.ID,
			Title:         row.Title,
			Author:        row.Author,
			ArtworkURL:    row.ArtworkURL,
			AverageRating: roundToOneDecimal(row.AverageRating),
			TotalReviews:  row.TotalReviews,
			FavoriteCount: row.FavoriteCount,
		})
	}

	return &PodcastSearchResult{
		Podcasts: items,
		Total:    len(items),
	}, nil
}

// GetByID は UUID でポッドキャストを取得します。
func (u *podcastUsecase) GetByID(ctx context.Context, id uuid.UUID) (*model.Podcast, error) {
	podcast, err := u.podcastRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get podcast: %w", err)
	}
	if podcast == nil {
		return nil, &NotFoundError{Resource: "podcast"}
	}
	return podcast, nil
}
