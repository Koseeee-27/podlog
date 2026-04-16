/**
 * podcast-requests DAL のユニットテスト。
 */
import { createPodcastRequest } from "../podcast-requests";
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

describe("createPodcastRequest", () => {
  it("POST /podcasts/request に認証付きで body を送る", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ id: "req-1", status: "pending" });

    const data = { title: "テスト番組", url: "https://example.com/feed" };
    await createPodcastRequest(data);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/podcasts/request",
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

  it("url が undefined でも正しく body を送る", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ id: "req-2", status: "pending" });

    const data = { title: "URL なし番組" };
    await createPodcastRequest(data);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/podcasts/request",
      expect.objectContaining({
        body: JSON.stringify(data),
      }),
    );
  });

  it("認証ヘッダーが空でも事前 throw せず apiFetch に委ねる", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({});

    await expect(
      createPodcastRequest({ title: "guest test" }),
    ).resolves.toBeDefined();
    expect(mockApiFetch).toHaveBeenCalled();
  });
});
