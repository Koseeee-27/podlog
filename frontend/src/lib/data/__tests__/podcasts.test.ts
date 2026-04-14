/**
 * podcasts DAL のユニットテスト。
 *
 * 注意: DAL 関数は React `cache()` でラップされているため、同一テストファイル
 * 内で同じ引数を複数回渡すと 2 回目以降 `apiFetch` が呼ばれない (リクエスト
 * スコープのメモ化)。各テストではユニークな id / クエリパラメータを使うか、
 * 別関数を呼ぶことでメモ化のヒットを避けている。新しいテストを追加する際は
 * この点に注意。
 */
import {
  getPodcastById,
  getPopularPodcasts,
  getPodcastRating,
  searchPodcasts,
  getPodcastEpisodes,
} from "../podcasts";
import { apiFetch } from "@/lib/api/fetch";
import { getAuthHeaders } from "@/lib/auth/getAuthHeaders";

jest.mock("@/lib/api/fetch", () => ({
  apiFetch: jest.fn(),
}));
jest.mock("@/lib/auth/getAuthHeaders", () => ({
  getAuthHeaders: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;
const mockGetAuthHeaders = getAuthHeaders as jest.MockedFunction<
  typeof getAuthHeaders
>;

beforeEach(() => {
  mockApiFetch.mockReset();
  mockGetAuthHeaders.mockReset();
});

describe("getPodcastById", () => {
  it("id を encodeURIComponent して revalidate: 60 で呼ぶ", async () => {
    mockApiFetch.mockResolvedValueOnce({});

    // ユニークな id で cache() のメモ化を回避
    await getPodcastById("podcast id/with slash-by-id");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/podcasts/podcast%20id%2Fwith%20slash-by-id",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60 },
      }),
    );
  });
});

describe("getPopularPodcasts", () => {
  it("limit 未指定ならクエリなし", async () => {
    mockApiFetch.mockResolvedValueOnce({ podcasts: [], total: 0 });

    await getPopularPodcasts();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/podcasts/popular",
      expect.objectContaining({
        method: "GET",
        next: { revalidate: 300, tags: ["popular-podcasts"] },
      }),
    );
  });

  it("limit 指定ならクエリに乗せる", async () => {
    mockApiFetch.mockResolvedValueOnce({ podcasts: [], total: 0 });

    await getPopularPodcasts(6);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/podcasts/popular?limit=6",
      expect.any(Object),
    );
  });
});

describe("getPodcastRating", () => {
  it("id を encodeURIComponent して revalidate: 60 で呼ぶ", async () => {
    mockApiFetch.mockResolvedValueOnce({ average_rating: 4, total_reviews: 10 });

    await getPodcastRating("rating id-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/podcasts/rating%20id-1/rating",
      expect.objectContaining({
        next: { revalidate: 60 },
      }),
    );
  });
});

describe("searchPodcasts", () => {
  it("q 指定はキャッシュしない (revalidate: 0)", async () => {
    mockApiFetch.mockResolvedValueOnce({ podcasts: [], total: 0 });

    await searchPodcasts({ q: "お笑い" });

    const call = mockApiFetch.mock.calls[0];
    expect(call[0]).toMatch(/^\/podcasts\/search\?/);
    expect(call[0]).toContain("q=");
    expect(call[1]).toEqual(
      expect.objectContaining({ next: { revalidate: 0 } }),
    );
  });

  it("genre 指定のみなら 60 秒キャッシュ", async () => {
    mockApiFetch.mockResolvedValueOnce({ podcasts: [], total: 0 });

    await searchPodcasts({ genre: "news", limit: 20, offset: 0 });

    const call = mockApiFetch.mock.calls[0];
    expect(call[0]).toContain("genre=news");
    expect(call[0]).toContain("limit=20");
    expect(call[0]).toContain("offset=0");
    expect(call[1]).toEqual(
      expect.objectContaining({ next: { revalidate: 60 } }),
    );
  });

  it("空文字列の q は「未指定」として扱い、URL にも乗せず revalidate: 60 にフォールバック", async () => {
    mockApiFetch.mockResolvedValueOnce({ podcasts: [], total: 0 });

    await searchPodcasts({ q: "", genre: "news-empty-q" });

    const call = mockApiFetch.mock.calls[0];
    // q= が URL に乗っていない
    expect(call[0]).not.toContain("q=");
    expect(call[0]).toContain("genre=news-empty-q");
    // revalidate は 60 秒側にフォールバック (フリーワード判定が false なので)
    expect(call[1]).toEqual(
      expect.objectContaining({ next: { revalidate: 60 } }),
    );
  });

  it("q / genre が両方未指定なら fail-fast で throw する (apiFetch を呼ばない)", async () => {
    // バックエンドの /podcasts/search ハンドラは q / genre が両方空だと 400 を
    // 返す。DAL 側でも明示的に throw して呼び出し側の誤呼び出しを早期発見する。
    await expect(searchPodcasts({})).rejects.toThrow(
      /searchPodcasts.*'q'.*'genre'/,
    );
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("q / genre が両方空文字列でも fail-fast で throw する", async () => {
    await expect(searchPodcasts({ q: "", genre: "" })).rejects.toThrow(
      /searchPodcasts/,
    );
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

describe("getPodcastEpisodes", () => {
  it("未ログイン時は revalidate: 60 で呼ぶ", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({ episodes: [], total: 0 });

    await getPodcastEpisodes("episodes-guest-id", 20, 0);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/podcasts/episodes-guest-id/episodes?limit=20&offset=0",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        next: { revalidate: 60 },
      }),
    );
    // Authorization ヘッダーが付いていない
    const init = mockApiFetch.mock.calls[0][1];
    expect(init?.headers).not.toHaveProperty("Authorization");
  });

  it("ログイン中は Authorization 付き + cache: no-store で呼ぶ", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ episodes: [], total: 0 });

    await getPodcastEpisodes("episodes-auth-id");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/podcasts/episodes-auth-id/episodes",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer jwt",
        }),
        cache: "no-store",
      }),
    );
    // revalidate は付けない
    const init = mockApiFetch.mock.calls[0][1];
    expect(init).not.toHaveProperty("next");
  });
});
