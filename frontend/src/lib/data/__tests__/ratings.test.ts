/**
 * ratings DAL のユニットテスト。
 *
 * 注意: DAL 関数は React `cache()` でラップされているため、同一テストファイル
 * 内で同じ引数を複数回渡すと 2 回目以降 `apiFetch` が呼ばれない (リクエスト
 * スコープのメモ化)。各テストではユニークな id / クエリパラメータを使うか、
 * 別関数を呼ぶことでメモ化のヒットを避けている。新しいテストを追加する際は
 * この点に注意。
 */
import {
  getMyRating,
  getEpisodeRating,
  getPodcastRating,
  getUserRatingsStats,
  getMyRatings,
  createRating,
  updateMyRating,
  deleteMyRating,
} from "../ratings";
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

describe("getMyRating", () => {
  it("認証ヘッダー付き + cache: no-store で呼ぶ", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({});

    await getMyRating("episode-mine-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/episode-mine-1/ratings/mine",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer jwt",
        }),
        cache: "no-store",
      }),
    );
    // Authorization 付きでは next.revalidate を指定しない（FE 規約）
    const init = mockApiFetch.mock.calls[0][1];
    expect(init).not.toHaveProperty("next");
  });

  it("episodeId を encodeURIComponent する", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({});

    await getMyRating("ep with/slash-mine");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/ep%20with%2Fslash-mine/ratings/mine",
      expect.any(Object),
    );
  });
});

describe("getEpisodeRating", () => {
  it("公開エンドポイントなので Authorization なし + revalidate: 0 で呼ぶ", async () => {
    mockApiFetch.mockResolvedValueOnce({
      average_rating: 4.2,
      total_ratings: 10,
      distribution: { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 },
    });

    await getEpisodeRating("episode-stats-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/episode-stats-1/ratings",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      }),
    );
    // 公開なので Authorization は付かない
    const init = mockApiFetch.mock.calls[0][1];
    expect(init?.headers).not.toHaveProperty("Authorization");
    expect(init).not.toHaveProperty("cache");
  });
});

describe("getPodcastRating", () => {
  it("id を encodeURIComponent して revalidate: 60 で呼ぶ", async () => {
    // BE が新型 `total_ratings` を返す前提（podlog#390 で切替済み）
    mockApiFetch.mockResolvedValueOnce({
      average_rating: 4,
      total_ratings: 10,
    });

    await getPodcastRating("rating id-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/podcasts/rating%20id-1/rating",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60 },
      }),
    );
  });
});

describe("getUserRatingsStats", () => {
  it("username を encodeURIComponent して revalidate: 60 で呼ぶ", async () => {
    mockApiFetch.mockResolvedValueOnce({
      total_ratings: 12,
      average_rating: 4.1,
      distribution: { "1": 0, "2": 1, "3": 2, "4": 4, "5": 5 },
    });

    await getUserRatingsStats("user with space");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/user%20with%20space/ratings/stats",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60 },
      }),
    );
  });
});

describe("getMyRatings", () => {
  it("limit / offset 未指定ならクエリなし + Authorization 付き + cache: no-store", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ ratings: [], total: 0 });

    await getMyRatings();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/me/ratings",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt",
        }),
        cache: "no-store",
      }),
    );
  });

  it("limit / offset 指定ならクエリに乗せる", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ ratings: [], total: 0 });

    await getMyRatings(20, 40);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/me/ratings?limit=20&offset=40",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });
});

describe("createRating", () => {
  it("POST で認証ヘッダー付き + JSON body を送る", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({});

    await createRating("episode-create-1", { rating: 5 });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/episode-create-1/ratings",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer jwt",
        }),
        body: JSON.stringify({ rating: 5 }),
      }),
    );
  });

  it("episodeId を encodeURIComponent する", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({});

    await createRating("ep with/slash-create", { rating: 4 });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/ep%20with%2Fslash-create/ratings",
      expect.any(Object),
    );
  });
});

describe("updateMyRating", () => {
  it("PUT で認証ヘッダー付き + JSON body を送る", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({});

    await updateMyRating("episode-update-1", { rating: 3 });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/episode-update-1/ratings/mine",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer jwt",
        }),
        body: JSON.stringify({ rating: 3 }),
      }),
    );
  });

  it("episodeId を encodeURIComponent する", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({});

    await updateMyRating("ep with/slash-update", { rating: 2 });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/ep%20with%2Fslash-update/ratings/mine",
      expect.any(Object),
    );
  });
});

describe("deleteMyRating", () => {
  it("DELETE で認証ヘッダーのみ送る (Content-Type は付けない)", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce(undefined);

    await deleteMyRating("episode-delete-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/episode-delete-1/ratings/mine",
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer jwt" },
      }),
    );
    // body を送らない
    const init = mockApiFetch.mock.calls[0][1];
    expect(init).not.toHaveProperty("body");
    // DELETE では Content-Type を付けない（PodLog API 規約）
    expect(init?.headers).not.toHaveProperty("Content-Type");
  });

  it("episodeId を encodeURIComponent する", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce(undefined);

    await deleteMyRating("ep with/slash-delete");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/ep%20with%2Fslash-delete/ratings/mine",
      expect.any(Object),
    );
  });
});
