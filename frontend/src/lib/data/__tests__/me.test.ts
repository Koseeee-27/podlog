/**
 * me DAL のユニットテスト。
 */
import {
  getMyProfile,
  getMyListeningRecords,
  getMyRecentEpisodes,
  getMyFavoritePodcasts,
} from "../me";
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

describe("getMyProfile", () => {
  it("Authorization 付き + cache: no-store で /users/me を呼ぶ", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({});

    await getMyProfile();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt",
          "Content-Type": "application/json",
        }),
        cache: "no-store",
      }),
    );
    const init = mockApiFetch.mock.calls[0][1];
    expect(init).not.toHaveProperty("next");
  });

  it("認証ヘッダーが空でも事前 throw せず apiFetch に委ねる", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({});

    await getMyProfile();

    expect(mockApiFetch).toHaveBeenCalled();
  });
});

describe("getMyListeningRecords", () => {
  it("limit / offset をクエリに乗せる", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ records: [], total: 0 });

    await getMyListeningRecords(5, 10);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/me/listening-records?limit=5&offset=10",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("limit / offset 省略時はクエリなし", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ records: [], total: 0 });

    await getMyListeningRecords();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/me/listening-records",
      expect.any(Object),
    );
  });
});

describe("getMyRecentEpisodes", () => {
  it("Authorization 付き + cache: no-store で呼ぶ", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({
      podcasts: [],
      recorded_podcast_count: 0,
    });

    await getMyRecentEpisodes();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/me/recent-episodes",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt",
        }),
        cache: "no-store",
      }),
    );
  });
});

describe("getMyFavoritePodcasts", () => {
  it("Authorization 付き + cache: no-store で呼ぶ", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ podcasts: [] });

    await getMyFavoritePodcasts();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/me/favorite-podcasts",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt",
        }),
        cache: "no-store",
      }),
    );
  });
});
