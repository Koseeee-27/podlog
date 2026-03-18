package usecase

import (
	"context"
	"fmt"

	"github.com/Koseeee-27/podlog/backend/internal/repository"
)

// GenreItem はジャンル一覧レスポンスの各要素です。
// id はジャンルの英語名をそのまま識別子として使います（例: "Comedy"）。
// name_en は英語表記、name_ja は日本語表記です。
type GenreItem struct {
	ID     string `json:"id"`
	NameEN string `json:"name_en"`
	NameJA string `json:"name_ja"`
}

// GenreListResult はジャンル一覧のレスポンスです。
type GenreListResult struct {
	Genres []GenreItem `json:"genres"`
}

// genreJAMap は iTunes のジャンル名から日本語名へのマッピングです。
// Apple Podcasts が返す主要なジャンル名を網羅しています。
// ここに載っていないジャンル名は英語のままフォールバックします。
var genreJAMap = map[string]string{
	"Arts":                      "アート",
	"Business":                  "ビジネス",
	"Comedy":                    "コメディ",
	"Education":                 "教育",
	"Fiction":                   "フィクション",
	"Government":                "行政",
	"Health & Fitness":          "健康/フィットネス",
	"History":                   "歴史",
	"Kids & Family":             "キッズ/ファミリー",
	"Leisure":                   "レジャー",
	"Music":                     "ミュージック",
	"News":                      "ニュース",
	"Religion & Spirituality":   "宗教/スピリチュアル",
	"Science":                   "サイエンス",
	"Society & Culture":         "社会/文化",
	"Sports":                    "スポーツ",
	"Technology":                "テクノロジー",
	"True Crime":                "トゥルークライム",
	"TV & Film":                 "テレビ/映画",
	"Japanese Baseball":         "日本の野球",
	"Entrepreneurship":          "起業",
	"Management":                "マネジメント",
	"Marketing":                 "マーケティング",
	"Self-Improvement":          "自己啓発",
	"Performing Arts":           "パフォーミングアート",
	"Personal Journals":         "パーソナルジャーナル",
	"Philosophy":                "哲学",
	"Places & Travel":           "旅行",
	"Relationships":             "人間関係",
	"Investing":                 "投資",
	"Careers":                   "キャリア",
	"Nature":                    "自然",
	"Life Sciences":             "ライフサイエンス",
	"Social Sciences":           "社会科学",
	"Mathematics":               "数学",
	"Documentary":               "ドキュメンタリー",
	"Drama":                     "ドラマ",
	"Improv":                    "即興コメディ",
	"Stand-Up":                  "スタンドアップコメディ",
	"Comedy Interviews":         "コメディインタビュー",
	"Daily News":                "デイリーニュース",
	"Entertainment News":        "エンタメニュース",
	"News Commentary":           "ニュース解説",
	"Politics":                  "政治",
	"Tech News":                 "テクニュース",
	"Sports News":               "スポーツニュース",
	"Football":                  "サッカー",
	"Basketball":                "バスケットボール",
	"Baseball":                  "野球",
	"Soccer":                    "サッカー",
	"Cricket":                   "クリケット",
	"Fantasy Sports":            "ファンタジースポーツ",
	"Film Reviews":              "映画レビュー",
	"After Shows":               "アフターショー",
	"Film History":              "映画史",
	"TV Reviews":                "テレビレビュー",
	"Mental Health":             "メンタルヘルス",
	"Fitness":                   "フィットネス",
	"Nutrition":                 "栄養",
	"Sexuality":                 "セクシュアリティ",
	"Alternative Health":        "代替医療",
	"Christianity":              "キリスト教",
	"Buddhism":                  "仏教",
	"Islam":                     "イスラム教",
	"Hinduism":                  "ヒンドゥー教",
	"Judaism":                   "ユダヤ教",
	"Spirituality":              "スピリチュアリティ",
	"Religion":                  "宗教",
	"Parenting":                 "子育て",
	"Pets & Animals":            "ペット/動物",
	"Stories for Kids":          "こどもの話",
	"Animation & Manga":         "アニメ/マンガ",
	"Automotive":                "自動車",
	"Aviation":                  "航空",
	"Crafts":                    "クラフト",
	"Games":                     "ゲーム",
	"Hobbies":                   "趣味",
	"Home & Garden":             "住宅/ガーデン",
	"Video Games":               "ビデオゲーム",
	"Music Commentary":          "音楽解説",
	"Music History":             "音楽史",
	"Music Interviews":          "音楽インタビュー",
	"Design":                    "デザイン",
	"Books":                     "書籍",
	"Food":                      "フード",
	"Visual Arts":               "ビジュアルアート",
	"Fashion & Beauty":          "ファッション/ビューティー",
	"Courses":                   "コース",
	"How To":                    "ハウツー",
	"Language Learning":         "語学学習",
	"Training":                  "トレーニング",
	"Comedy Fiction":            "コメディフィクション",
	"Science Fiction":           "SF",
	"Astronomy":                 "天文学",
	"Chemistry":                 "化学",
	"Earth Sciences":            "地球科学",
	"Physics":                   "物理学",
	"Wilderness":                "アウトドア",
	"Wrestling":                 "プロレス",
	"Running":                   "ランニング",
	"Swimming":                  "水泳",
	"Golf":                      "ゴルフ",
	"Tennis":                    "テニス",
	"Volleyball":                "バレーボール",
	"Rugby":                     "ラグビー",
	"Tabletop":                  "テーブルゲーム",
}

// GenreUsecase はジャンルに関するビジネスロジックのインターフェースです。
type GenreUsecase interface {
	// ListGenres は DB に登録されている番組のジャンル一覧を返します。
	// 英語名と日本語名の両方を含みます。
	ListGenres(ctx context.Context) (*GenreListResult, error)
}

type genreUsecase struct {
	podcastRepo repository.PodcastRepository
}

// NewGenreUsecase は GenreUsecase の新しいインスタンスを生成します。
// ジャンル情報は podcasts テーブルの genre カラムから取得するため、
// PodcastRepository に依存します。
func NewGenreUsecase(podcastRepo repository.PodcastRepository) GenreUsecase {
	return &genreUsecase{
		podcastRepo: podcastRepo,
	}
}

// ListGenres は DB から DISTINCT なジャンル一覧を取得し、日本語名を付与して返します。
// genreJAMap に定義がないジャンルは英語名をそのまま name_ja にフォールバックします。
func (u *genreUsecase) ListGenres(ctx context.Context) (*GenreListResult, error) {
	genres, err := u.podcastRepo.GetDistinctGenres(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list genres: %w", err)
	}

	items := make([]GenreItem, 0, len(genres))
	for _, g := range genres {
		nameJA := g // デフォルトは英語名のままフォールバック
		if ja, ok := genreJAMap[g]; ok {
			nameJA = ja
		}
		items = append(items, GenreItem{
			ID:     g,
			NameEN: g,
			NameJA: nameJA,
		})
	}

	return &GenreListResult{
		Genres: items,
	}, nil
}
