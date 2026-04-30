/**
 * sitemap DAL のユニットテスト。
 *
 * 注意: DAL 関数は React `cache()` でラップされているため、同一テストファイル内で
 * 同じ関数を複数回呼ぶと 2 回目以降 `apiFetch` が呼ばれない（リクエストスコープの
 * メモ化）。本テストでは各関数を 1 回ずつしか呼ばない構成にしてメモ化のヒットを
 * 回避している。
 */
import {
  getSitemapPodcasts,
  getSitemapEpisodes,
  getSitemapUsers,
} from "../sitemap";
import { apiFetch } from "@/lib/api/fetch";

jest.mock("@/lib/api/fetch", () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  mockApiFetch.mockReset();
  // 各テストで SITEMAP_API_TOKEN を独立に設定できるように env を退避
  process.env = { ...ORIGINAL_ENV };
  delete process.env.SITEMAP_API_TOKEN;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("getSitemapPodcasts", () => {
  it("SITEMAP_API_TOKEN がある場合 Authorization ヘッダーを付ける", async () => {
    process.env.SITEMAP_API_TOKEN = "test-token-123";
    mockApiFetch.mockResolvedValueOnce({ items: [] });

    await getSitemapPodcasts();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/sitemap/podcasts",
      expect.objectContaining({
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token-123",
        },
        next: { revalidate: 3600 },
      }),
    );
  });
});

describe("getSitemapEpisodes", () => {
  it("SITEMAP_API_TOKEN が未設定なら Authorization ヘッダーを付けない (dev 想定)", async () => {
    // SITEMAP_API_TOKEN を未設定のまま
    mockApiFetch.mockResolvedValueOnce({ items: [] });

    await getSitemapEpisodes();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/sitemap/episodes",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 3600 },
      }),
    );
    // Authorization ヘッダーが含まれていないことを明示的に確認
    const call = mockApiFetch.mock.calls[0];
    const headers = (call[1]?.headers ?? {}) as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
  });
});

describe("getSitemapUsers", () => {
  it("空文字列の SITEMAP_API_TOKEN は trim 後に未設定扱いにする", async () => {
    // 空白だけの環境変数は誤設定として扱い、Authorization ヘッダーを付けない
    process.env.SITEMAP_API_TOKEN = "   ";
    mockApiFetch.mockResolvedValueOnce({ items: [] });

    await getSitemapUsers();

    const call = mockApiFetch.mock.calls[0];
    const headers = (call[1]?.headers ?? {}) as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
  });
});
