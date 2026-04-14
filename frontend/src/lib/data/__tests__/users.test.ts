/**
 * users DAL のユニットテスト。
 */
import {
  getUserPublicProfile,
  getUserListeningRecords,
  getUserReviews,
  getUserFavoritePodcasts,
} from "../users";
import { apiFetch } from "@/lib/api/fetch";

jest.mock("@/lib/api/fetch", () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe("getUserPublicProfile", () => {
  it("username を encodeURIComponent して revalidate: 60 で呼ぶ", async () => {
    mockApiFetch.mockResolvedValueOnce({});

    await getUserPublicProfile("alice/bob");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/alice%2Fbob",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60 },
      }),
    );
    // Authorization は付かない (公開エンドポイント)
    const init = mockApiFetch.mock.calls[0][1];
    expect(init?.headers).not.toHaveProperty("Authorization");
  });
});

describe("getUserListeningRecords", () => {
  it("limit / offset をクエリに乗せ revalidate: 0", async () => {
    mockApiFetch.mockResolvedValueOnce({ records: [], total: 0 });

    await getUserListeningRecords("alice", 10, 20);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/alice/listening-records?limit=10&offset=20",
      expect.objectContaining({
        next: { revalidate: 0 },
      }),
    );
  });

  it("引数省略時はクエリなし", async () => {
    mockApiFetch.mockResolvedValueOnce({ records: [], total: 0 });

    await getUserListeningRecords("bob");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/bob/listening-records",
      expect.any(Object),
    );
  });
});

describe("getUserReviews", () => {
  it("limit / offset をクエリに乗せ revalidate: 0", async () => {
    mockApiFetch.mockResolvedValueOnce({ reviews: [], total: 0 });

    await getUserReviews("alice", 10, 0);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/alice/reviews?limit=10&offset=0",
      expect.objectContaining({
        next: { revalidate: 0 },
      }),
    );
  });
});

describe("getUserFavoritePodcasts", () => {
  it("username を encodeURIComponent して revalidate: 0 で呼ぶ", async () => {
    mockApiFetch.mockResolvedValueOnce({ podcasts: [] });

    await getUserFavoritePodcasts("alice user");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/alice%20user/favorite-podcasts",
      expect.objectContaining({
        next: { revalidate: 0 },
      }),
    );
  });
});
