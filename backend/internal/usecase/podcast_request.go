package usecase

import (
	"context"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/model"
	"github.com/kobayashikosei/podlog/backend/internal/repository"
)

// CreatePodcastRequestInput は番組追加リクエスト作成時のリクエストボディです。
// handler 層で c.Bind() によって JSON から変換されます。
type CreatePodcastRequestInput struct {
	Title string  `json:"title"`          // 必須: 番組名
	URL   *string `json:"url,omitempty"`  // 任意: Apple Podcasts や Spotify の URL
}

// PodcastRequestResult は番組追加リクエスト作成後のレスポンスです。
// Issue の仕様に従い、id, title, url, status, created_at のみ返します。
type PodcastRequestResult struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	URL       *string   `json:"url,omitempty"`
	Status    string    `json:"status"`
	CreatedAt string    `json:"created_at"`
}

// PodcastRequestUsecase は番組追加リクエストに関するビジネスロジックです。
type PodcastRequestUsecase interface {
	// Create は番組追加リクエストを作成します。
	Create(ctx context.Context, userID uuid.UUID, input CreatePodcastRequestInput) (*PodcastRequestResult, error)
}

// podcastRequestUsecase は PodcastRequestUsecase の実装です。
type podcastRequestUsecase struct {
	podcastRequestRepo repository.PodcastRequestRepository
}

// NewPodcastRequestUsecase は PodcastRequestUsecase の新しいインスタンスを生成します。
func NewPodcastRequestUsecase(podcastRequestRepo repository.PodcastRequestRepository) PodcastRequestUsecase {
	return &podcastRequestUsecase{
		podcastRequestRepo: podcastRequestRepo,
	}
}

// Create は番組追加リクエストを作成します。
//
// 処理の流れ:
//  1. バリデーション（title: 必須・最大500文字、url: 形式チェック）
//  2. モデルを組み立ててDBに保存
//  3. レスポンス用の構造体に変換して返す
func (u *podcastRequestUsecase) Create(ctx context.Context, userID uuid.UUID, input CreatePodcastRequestInput) (*PodcastRequestResult, error) {
	// 1. バリデーション
	if err := validatePodcastRequestInput(input); err != nil {
		return nil, err
	}

	// 2. モデルを組み立ててDBに保存
	// URL が空文字列の場合は nil として扱う（DB に空文字を保存しないため）
	var urlPtr *string
	if input.URL != nil && strings.TrimSpace(*input.URL) != "" {
		trimmed := strings.TrimSpace(*input.URL)
		urlPtr = &trimmed
	}

	req := &model.PodcastRequest{
		ID:     uuid.New(),
		UserID: userID,
		Title:  strings.TrimSpace(input.Title),
		URL:    urlPtr,
		Status: "pending", // 新規リクエストは常に pending
	}

	if err := u.podcastRequestRepo.Create(ctx, req); err != nil {
		return nil, err
	}

	// 3. レスポンス用の構造体に変換して返す
	// DB の DEFAULT NOW() で設定される created_at を正確に返すため、
	// 本来は再取得するのが理想ですが、今回はシンプルに現在時刻を使います。
	// （レスポンスの時刻と DB の時刻に数ミリ秒のズレが出る可能性がありますが、
	//   この機能では問題になりません）
	return &PodcastRequestResult{
		ID:        req.ID,
		Title:     req.Title,
		URL:       req.URL,
		Status:    req.Status,
		CreatedAt: req.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

// validatePodcastRequestInput は番組追加リクエストの入力をバリデーションします。
func validatePodcastRequestInput(input CreatePodcastRequestInput) error {
	// title は必須
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return &ValidationError{Message: "title is required"}
	}

	// title は最大500文字（DB の VARCHAR(500) に合わせる）
	if len(title) > 500 {
		return &ValidationError{Message: "title must be 500 characters or less"}
	}

	// url が指定されている場合、有効な URL 形式かチェック
	if input.URL != nil {
		trimmedURL := strings.TrimSpace(*input.URL)
		if trimmedURL != "" {
			parsed, err := url.ParseRequestURI(trimmedURL)
			if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
				return &ValidationError{Message: "url must be a valid HTTP or HTTPS URL"}
			}
		}
	}

	return nil
}
