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
// Apple Podcasts の公式カテゴリツリーに基づき、DB に保存されている日本語のサブカテゴリ名を
// 親カテゴリ（日本語）に集約します。
//
// 重要: DB のジャンル名は日本語で保存されているため、キーも日本語にする必要があります。
// 以前は英語名をキーにしていたため、マッピングにヒットせず集約が機能していませんでした。
//
// 親カテゴリ自身もキーとして含めます（例: "コメディ" → "コメディ"）。
// これにより、親カテゴリ名がそのまま DB に入っている場合も正しく集約できます。
//
// マッピングに存在しないジャンル名は、そのまま独立したカテゴリとして扱います。
var genreParentMap = map[string]string{
	// アート（Arts）
	"アート":             "アート",
	"ブック":             "アート",
	"ファッション／美容":   "アート",
	"フード":             "アート",
	"パフォーマンスアート": "アート",
	"ビジュアルアート":     "アート",

	// ビジネス（Business）
	"ビジネス":         "ビジネス",
	"キャリア":         "ビジネス",
	"起業":            "ビジネス",
	"投資":            "ビジネス",
	"マネージメント":    "ビジネス",
	"マーケティング":    "ビジネス",
	"非営利":          "ビジネス",
	"ビジネスニュース": "ビジネス",

	// コメディ（Comedy）
	"コメディ":                 "コメディ",
	"コメディ・インタビュー":     "コメディ",
	"即興コメディ":             "コメディ",
	"スタンドアップ・コメディ":   "コメディ",

	// 教育（Education）
	"教育":         "教育",
	"コース":       "教育",
	"ハウツー":      "教育",
	"言語学習":      "教育",
	"自己啓発":      "教育",
	"子どもの教育":   "教育",

	// フィクション（Fiction）
	"ドラマ": "フィクション",
	"SF":    "フィクション",

	// 行政（Government）
	"行政": "行政",

	// 健康／フィットネス（Health & Fitness）
	"健康／フィットネス": "健康／フィットネス",
	"代替療法":         "健康／フィットネス",
	"医学":            "健康／フィットネス",
	"メンタルヘルス":    "健康／フィットネス",
	"セクシャリティ":    "健康／フィットネス",
	"ランニング":       "健康／フィットネス",

	// 歴史（History）
	"歴史": "歴史",

	// キッズ／ファミリー（Kids & Family）
	"キッズ／ファミリー": "キッズ／ファミリー",
	"子育て":           "キッズ／ファミリー",
	"子どもの読みもの":   "キッズ／ファミリー",

	// レジャー（Leisure）
	"レジャー":     "レジャー",
	"ビデオゲーム":  "レジャー",
	"趣味":        "レジャー",
	"ホッケー":     "レジャー",

	// 音楽（Music）
	"音楽":             "音楽",
	"音楽解説":          "音楽",
	"音楽史":            "音楽",
	"音楽インタビュー":   "音楽",

	// ニュース（News）
	"ニュース":                   "ニュース",
	"今日のニュース":              "ニュース",
	"エンターテインメントニュース": "ニュース",
	"ニュース解説":               "ニュース",
	"政治":                      "ニュース",
	"技術ニュース":               "ニュース",

	// 宗教／スピリチュアル（Religion & Spirituality）
	"仏教":           "宗教／スピリチュアル",
	"宗教":           "宗教／スピリチュアル",
	"スピリチュアル":   "宗教／スピリチュアル",

	// 科学（Science）
	"科学":     "科学",
	"自然科学":  "科学",
	"社会科学":  "科学",

	// 社会／文化（Society & Culture）
	"社会／文化":         "社会／文化",
	"ドキュメンタリー":    "社会／文化",
	"個人ジャーナル":     "社会／文化",
	"哲学":              "社会／文化",
	"地域情報／トラベル":  "社会／文化",
	"恋愛関係":           "社会／文化",

	// スポーツ（Sports）
	"スポーツ":             "スポーツ",
	"アメリカンフットボール": "スポーツ",
	"ゴルフ":              "スポーツ",
	"サッカー":             "スポーツ",

	// テクノロジー（Technology）
	"テクノロジー": "テクノロジー",

	// 事件／犯罪（True Crime）
	"事件／犯罪": "事件／犯罪",

	// テレビ番組／映画（TV & Film）
	"テレビ番組／映画": "テレビ番組／映画",
	"映画レビュー":    "テレビ番組／映画",
	"TV番組レビュー":  "テレビ番組／映画",
}

// parentGenreENMap は親カテゴリの日本語名 → 英語名のマッピングです。
// genreParentMap のキーが日本語になったため、英語名の逆引きに使います。
// ListGenres() で id（英語名）と name_en を返すために必要です。
var parentGenreENMap = map[string]string{
	"アート":             "Arts",
	"ビジネス":           "Business",
	"コメディ":           "Comedy",
	"教育":              "Education",
	"フィクション":       "Fiction",
	"行政":              "Government",
	"健康／フィットネス":  "Health & Fitness",
	"歴史":              "History",
	"キッズ／ファミリー":  "Kids & Family",
	"レジャー":           "Leisure",
	"音楽":              "Music",
	"ニュース":           "News",
	"宗教／スピリチュアル": "Religion & Spirituality",
	"科学":              "Science",
	"社会／文化":         "Society & Culture",
	"スポーツ":           "Sports",
	"テクノロジー":       "Technology",
	"事件／犯罪":         "True Crime",
	"テレビ番組／映画":    "TV & Film",
}

// parentToSubGenres は親カテゴリ（日本語）→ サブカテゴリ一覧（日本語）の逆引きマップです。
// init() で genreParentMap から自動生成します。
// 検索 API で親カテゴリ名を受け取ったとき、対応する全サブカテゴリに展開するために使います。
var parentToSubGenres map[string][]string

// enToJAParent は英語の親カテゴリ名 → 日本語の親カテゴリ名の逆引きマップです。
// parentGenreENMap から init() で自動生成します。
// ExpandGenre() が英語名を受け取ったとき、日本語の parentToSubGenres を引くために使います。
var enToJAParent map[string]string

// init は Go のパッケージ初期化関数で、プログラム起動時に自動的に呼ばれます。
// genreParentMap を逆引きして parentToSubGenres を構築し、
// parentGenreENMap を逆引きして enToJAParent を構築します。
func init() {
	parentToSubGenres = make(map[string][]string)
	for sub, parent := range genreParentMap {
		parentToSubGenres[parent] = append(parentToSubGenres[parent], sub)
	}
	// 安定したソート順を保証するため、各親カテゴリのサブカテゴリをソートします
	for parent := range parentToSubGenres {
		sort.Strings(parentToSubGenres[parent])
	}

	// parentGenreENMap（日本語→英語）を逆引きして enToJAParent（英語→日本語）を構築
	enToJAParent = make(map[string]string)
	for ja, en := range parentGenreENMap {
		enToJAParent[en] = ja
	}
}

// ExpandGenre は親カテゴリ名（英語または日本語）を受け取り、
// 対応するサブカテゴリの一覧（日本語名）を返します。
//
// フロントエンドはジャンル一覧 API の id（英語名、例: "Comedy"）を送ってきます。
// DB のジャンル名は日本語なので、英語名を日本語に変換してからサブカテゴリを展開し、
// DB の WHERE genre IN (...) で使える日本語名のリストを返します。
//
// 引数が親カテゴリでない場合（マッピングに存在しない場合）は、
// その値をそのまま1要素のスライスとして返します。
func ExpandGenre(genre string) []string {
	// まず日本語名でそのまま引いてみる
	if subs, ok := parentToSubGenres[genre]; ok {
		return append([]string(nil), subs...)
	}
	// 英語名が渡された場合、日本語の親カテゴリ名に変換してから引く
	if ja, ok := enToJAParent[genre]; ok {
		if subs, ok := parentToSubGenres[ja]; ok {
			return append([]string(nil), subs...)
		}
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
// 1. DB から重複なしのジャンル名一覧を取得（例: "コメディ", "即興コメディ", "ニュース", "今日のニュース"）
// 2. genreParentMap を使ってサブカテゴリを親カテゴリに変換（例: "即興コメディ" → "コメディ"）
// 3. 重複を排除してユニークな親カテゴリだけにする
// 4. parentGenreENMap から英語名を取得して返す
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
		// p は日本語の親カテゴリ名（例: "コメディ"）
		// parentGenreENMap から英語名を取得し、ID と NameEN に使う
		nameEN := p // フォールバック: 英語名が見つからなければ日本語名をそのまま使う
		if en, ok := parentGenreENMap[p]; ok {
			nameEN = en
		}
		items = append(items, GenreItem{
			ID:     nameEN,
			NameEN: nameEN,
			NameJA: p, // 親カテゴリ名がそのまま日本語名
		})
	}

	return &GenreListResult{
		Genres: items,
	}, nil
}
