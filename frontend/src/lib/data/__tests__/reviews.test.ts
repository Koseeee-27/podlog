/**
 * reviews DAL のユニットテスト。
 *
 * 注意: DAL 関数は React `cache()` でラップされているため、同一テストファイル
 * 内で同じ引数を複数回渡すと 2 回目以降 `apiFetch` が呼ばれない。各テストでは
 * ユニークな episodeId を使ってメモ化のヒットを避けている。
 */
import { getReviewsByEpisodeId, getMyReview } from "../reviews";
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

describe("getReviewsByEpisodeId", () => {
  it("limit / offset を URL に乗せ、revalidate: 0 で呼ぶ", async () => {
    mockApiFetch.mockResolvedValueOnce({
      reviews: [],
      total: 0,
      average_rating: 0,
    });

    await getReviewsByEpisodeId("review-list-1", 20, 0);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/review-list-1/reviews?limit=20&offset=0",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      }),
    );
    // Authorization ヘッダーは付かない (公開エンドポイント)
    const init = mockApiFetch.mock.calls[0][1];
    expect(init?.headers).not.toHaveProperty("Authorization");
  });

  it("limit / offset 省略時はクエリなし", async () => {
    mockApiFetch.mockResolvedValueOnce({
      reviews: [],
      total: 0,
      average_rating: 0,
    });

    await getReviewsByEpisodeId("review-list-no-q");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/review-list-no-q/reviews",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      }),
    );
  });
});

describe("getMyReview", () => {
  it("Authorization 付き + cache: no-store で呼ぶ", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({
      id: "review-1",
      rating: 5,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    await getMyReview("my-review-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/my-review-1/reviews/mine",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt",
          "Content-Type": "application/json",
        }),
        cache: "no-store",
      }),
    );
  });

  it("認証ヘッダーが空でも事前 throw せず apiFetch に委ねる", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({
      id: "review-2",
      rating: 4,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    await getMyReview("my-review-guest");

    expect(mockApiFetch).toHaveBeenCalled();
  });
});
