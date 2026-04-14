/**
 * podcasts DAL のユニットテスト。
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
