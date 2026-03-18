package usecase

import (
	"context"
	"fmt"
	"sort"

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

// genreParentMap はサブカテゴリ → 親カテゴリのマッピングです。
// Apple Podcasts の公式カテゴリツリーに基づき、DB に保存されているサブカテゴリ名を
// 親カテゴリに集約します。
//
// 親カテゴリ自身もキーとして含めます（例: "Comedy" → "Comedy"）。
// これにより、親カテゴリ名がそのまま DB に入っている場合も正しく集約できます。
//
// マッピングに存在しないジャンル名は、そのまま独立したカテゴリとして扱います。
var genreParentMap = map[string]string{
	// Arts（アート）
	"Arts":             "Arts",
	"Books":            "Arts",
	"Design":           "Arts",
	"Fashion & Beauty": "Arts",
	"Food":             "Arts",
	"Performing Arts":  "Arts",
	"Visual Arts":      "Arts",

	// Business（ビジネス）
	"Business":         "Business",
	"Careers":          "Business",
	"Entrepreneurship": "Business",
	"Investing":        "Business",
	"Management":       "Business",
	"Marketing":        "Business",

	// Comedy（コメディ）
	"Comedy":            "Comedy",
	"Comedy Fiction":    "Comedy",
	"Comedy Interviews": "Comedy",
	"Improv":            "Comedy",
	"Stand-Up":          "Comedy",

	// Education（教育）
	"Education":         "Education",
	"Courses":           "Education",
	"How To":            "Education",
	"Language Learning": "Education",
	"Self-Improvement":  "Education",
	"Training":          "Education",

	// Fiction（フィクション）
	"Fiction":         "Fiction",
	"Drama":           "Fiction",
	"Science Fiction": "Fiction",

	// Government（行政）
	"Government": "Government",

	// Health & Fitness（健康/フィットネス）
	"Health & Fitness":  "Health & Fitness",
	"Alternative Health": "Health & Fitness",
	"Fitness":            "Health & Fitness",
	"Medicine":           "Health & Fitness",
	"Mental Health":      "Health & Fitness",
	"Nutrition":          "Health & Fitness",
	"Sexuality":          "Health & Fitness",

	// History（歴史）
	"History": "History",

	// Kids & Family（キッズ/ファミリー）
	"Kids & Family":    "Kids & Family",
	"Parenting":        "Kids & Family",
	"Pets & Animals":   "Kids & Family",
	"Stories for Kids": "Kids & Family",

	// Leisure（レジャー）
	"Leisure":          "Leisure",
	"Animation & Manga": "Leisure",
	"Automotive":        "Leisure",
	"Aviation":          "Leisure",
	"Crafts":            "Leisure",
	"Games":             "Leisure",
	"Hobbies":           "Leisure",
	"Home & Garden":     "Leisure",
	"Video Games":       "Leisure",
	"Tabletop":          "Leisure",

	// Music（ミュージック）
	"Music":            "Music",
	"Music Commentary": "Music",
	"Music History":    "Music",
	"Music Interviews": "Music",

	// News（ニュース）
	"News":               "News",
	"Daily News":         "News",
	"Entertainment News": "News",
	"News Commentary":    "News",
	"Politics":           "News",
	"Tech News":          "News",
	"Sports News":        "News",

	// Religion & Spirituality（宗教/スピリチュアル）
	"Religion & Spirituality": "Religion & Spirituality",
	"Buddhism":                "Religion & Spirituality",
	"Christianity":            "Religion & Spirituality",
	"Hinduism":                "Religion & Spirituality",
	"Islam":                   "Religion & Spirituality",
	"Judaism":                 "Religion & Spirituality",
	"Religion":                "Religion & Spirituality",
	"Spirituality":            "Religion & Spirituality",

	// Science（サイエンス）
	"Science":        "Science",
	"Astronomy":      "Science",
	"Chemistry":      "Science",
	"Earth Sciences": "Science",
	"Life Sciences":  "Science",
	"Mathematics":    "Science",
	"Nature":         "Science",
	"Physics":        "Science",
	"Social Sciences": "Science",

	// Society & Culture（社会/文化）
	"Society & Culture":  "Society & Culture",
	"Documentary":        "Society & Culture",
	"Personal Journals":  "Society & Culture",
	"Philosophy":         "Society & Culture",
	"Places & Travel":    "Society & Culture",
	"Relationships":      "Society & Culture",

	// Sports（スポーツ）
	"Sports":           "Sports",
	"Baseball":         "Sports",
	"Basketball":       "Sports",
	"Cricket":          "Sports",
	"Fantasy Sports":   "Sports",
	"Football":         "Sports",
	"Golf":             "Sports",
	"Japanese Baseball": "Sports",
	"Rugby":            "Sports",
	"Running":          "Sports",
	"Soccer":           "Sports",
	"Swimming":         "Sports",
	"Tennis":           "Sports",
	"Volleyball":       "Sports",
	"Wilderness":       "Sports",
	"Wrestling":        "Sports",

	// Technology（テクノロジー）
	"Technology": "Technology",

	// True Crime（トゥルークライム）
	"True Crime": "True Crime",

	// TV & Film（テレビ/映画）
	"TV & Film":     "TV & Film",
	"After Shows":   "TV & Film",
	"Film History":  "TV & Film",
	"Film Reviews":  "TV & Film",
	"TV Reviews":    "TV & Film",
}

// parentGenreJAMap は親カテゴリの英語名 → 日本語名のマッピングです。
// genreJAMap からの移行として、親カテゴリだけに絞った簡潔なマップです。
var parentGenreJAMap = map[string]string{
	"Arts":                     "アート",
	"Business":                 "ビジネス",
	"Comedy":                   "コメディ",
	"Education":                "教育",
	"Fiction":                  "フィクション",
	"Government":               "行政",
	"Health & Fitness":         "健康/フィットネス",
	"History":                  "歴史",
	"Kids & Family":            "キッズ/ファミリー",
	"Leisure":                  "レジャー",
	"Music":                    "ミュージック",
	"News":                     "ニュース",
	"Religion & Spirituality":  "宗教/スピリチュアル",
	"Science":                  "サイエンス",
	"Society & Culture":        "社会/文化",
	"Sports":                   "スポーツ",
	"Technology":               "テクノロジー",
	"True Crime":               "トゥルークライム",
	"TV & Film":                "テレビ/映画",
}

// parentToSubGenres は親カテゴリ → サブカテゴリ一覧の逆引きマップです。
// init() で genreParentMap から自動生成します。
// 検索 API で親カテゴリ名を受け取ったとき、対応する全サブカテゴリに展開するために使います。
var parentToSubGenres map[string][]string

// init は Go のパッケージ初期化関数で、プログラム起動時に自動的に呼ばれます。
// genreParentMap を逆引きして parentToSubGenres を構築します。
func init() {
	parentToSubGenres = make(map[string][]string)
	for sub, parent := range genreParentMap {
		parentToSubGenres[parent] = append(parentToSubGenres[parent], sub)
	}
	// 安定したソート順を保証するため、各親カテゴリのサブカテゴリをソートします
	for parent := range parentToSubGenres {
		sort.Strings(parentToSubGenres[parent])
	}
}

// ExpandGenre は親カテゴリ名を受け取り、対応するサブカテゴリの一覧を返します。
// 検索 API で「コメディ」が選択されたとき、DB では "Comedy", "Comedy Fiction",
// "Comedy Interviews", "Improv", "Stand-Up" のいずれかが入っているので、
// これらを全て返して IN 句で検索できるようにします。
//
// 引数が親カテゴリでない場合（マッピングに存在しない場合）は、
// その値をそのまま1要素のスライスとして返します。
func ExpandGenre(genre string) []string {
	if subs, ok := parentToSubGenres[genre]; ok {
		return subs
	}
	// マッピングにない場合はそのジャンル名で直接検索
	return []string{genre}
}

// ToParentGenre はサブカテゴリ名を親カテゴリ名に変換します。
// マッピングに存在しない場合はそのまま返します。
func ToParentGenre(genre string) string {
	if parent, ok := genreParentMap[genre]; ok {
		return parent
	}
	return genre
}

// GenreUsecase はジャンルに関するビジネスロジックのインターフェースです。
type GenreUsecase interface {
	// ListGenres は DB に登録されている番組のジャンル一覧を返します。
	// サブカテゴリを親カテゴリに集約し、重複を排除して返します。
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

// ListGenres は DB から DISTINCT なジャンル一覧を取得し、親カテゴリに集約して返します。
//
// 処理の流れ:
// 1. DB から重複なしのジャンル名一覧を取得（例: "Comedy", "Improv", "Stand-Up", "News", "Daily News"）
// 2. genreParentMap を使ってサブカテゴリを親カテゴリに変換（例: "Improv" → "Comedy"）
// 3. 重複を排除してユニークな親カテゴリだけにする
// 4. parentGenreJAMap から日本語名を取得して返す
func (u *genreUsecase) ListGenres(ctx context.Context) (*GenreListResult, error) {
	genres, err := u.podcastRepo.GetDistinctGenres(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list genres: %w", err)
	}

	// seen マップで重複チェックしながら親カテゴリに集約します。
	// Go の map はキーの存在チェックに使うと便利で、ここでは
	// 「このカテゴリは既に追加済みか？」を O(1) で判定しています。
	seen := make(map[string]bool)
	var parentGenres []string

	for _, g := range genres {
		parent := ToParentGenre(g)
		if !seen[parent] {
			seen[parent] = true
			parentGenres = append(parentGenres, parent)
		}
	}

	// アルファベット順にソートして安定した順序を保証します
	sort.Strings(parentGenres)

	items := make([]GenreItem, 0, len(parentGenres))
	for _, p := range parentGenres {
		nameJA := p // デフォルトは英語名のままフォールバック
		if ja, ok := parentGenreJAMap[p]; ok {
			nameJA = ja
		}
		items = append(items, GenreItem{
			ID:     p,
			NameEN: p,
			NameJA: nameJA,
		})
	}

	return &GenreListResult{
		Genres: items,
	}, nil
}
