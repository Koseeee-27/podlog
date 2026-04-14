/**
 * episodes DAL のユニットテスト。
 */
import { getEpisodeById, getEpisodeListenStatus } from "../episodes";
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

describe("getEpisodeById", () => {
  it("未ログイン時は Authorization なし + revalidate: 60", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({});

    await getEpisodeById("episode-guest-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/episode-guest-1",
      expect.objectContaining({
        method: "GET",
        next: { revalidate: 60 },
      }),
    );
    const init = mockApiFetch.mock.calls[0][1];
    expect(init?.headers).not.toHaveProperty("Authorization");
    expect(init).not.toHaveProperty("cache");
  });

  it("ログイン中は Authorization 付き + cache: no-store", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({});

    await getEpisodeById("episode-auth-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/episode-auth-1",
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

  it("id を encodeURIComponent する", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({});

    await getEpisodeById("id with/slash");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/id%20with%2Fslash",
      expect.any(Object),
    );
  });
});

describe("getEpisodeListenStatus", () => {
  it("認証ヘッダー + cache: no-store で呼ぶ", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ listened: true });

    await getEpisodeListenStatus("listen-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/listen-1/listen",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt",
        }),
        cache: "no-store",
      }),
    );
  });

  it("認証ヘッダーが空でも事前 throw せず apiFetch に委ねる", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({ listened: false });

    // 事前判定で throw しないことを確認 (呼び出し側の ApiRequestError catch パターン)
    await getEpisodeListenStatus("listen-guest");

    expect(mockApiFetch).toHaveBeenCalled();
  });
});
