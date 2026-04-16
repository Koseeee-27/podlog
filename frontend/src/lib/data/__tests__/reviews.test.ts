/**
 * reviews DAL のユニットテスト。
 *
 * 注意: DAL 関数は React `cache()` でラップされているため、同一テストファイル
 * 内で同じ引数を複数回渡すと 2 回目以降 `apiFetch` が呼ばれない。各テストでは
 * ユニークな episodeId を使ってメモ化のヒットを避けている。
 */
import {
  getReviewsByEpisodeId,
  getMyReview,
  createReview,
  updateMyReview,
  deleteMyReview,
} from "../reviews";
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

// --- mutation 関数のテスト ---
// mutation は cache() でラップされていない通常の async 関数なので、
// 同じ引数で複数回呼んでもメモ化の影響は無い。

describe("createReview", () => {
  it("POST /episodes/:id/reviews に認証付きで body を送る", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ id: "new-review" });

    const data = { rating: 5, comment: "最高" };
    await createReview("ep-create-1", data);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/ep-create-1/reviews",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(data),
      }),
    );
  });
});

describe("updateMyReview", () => {
  it("PUT /episodes/:id/reviews/mine に認証付きで body を送る", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ id: "updated-review" });

    const data = { rating: 4, comment: "更新" };
    await updateMyReview("ep-update-1", data);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/ep-update-1/reviews/mine",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(data),
      }),
    );
  });
});

describe("deleteMyReview", () => {
  it("DELETE /episodes/:id/reviews/mine に認証付きで呼ぶ (body なし)", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce(undefined);

    await deleteMyReview("ep-delete-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/ep-delete-1/reviews/mine",
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer jwt" },
      }),
    );
    // DELETE は Content-Type を付けない
    const init = mockApiFetch.mock.calls[0][1];
    expect(init?.headers).not.toHaveProperty("Content-Type");
    // body が無いことを確認
    expect(init).not.toHaveProperty("body");
  });
});
