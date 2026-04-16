/**
 * me DAL のユニットテスト。
 */
import {
  getMyProfile,
  getMyListeningRecords,
  getMyRecentEpisodes,
  createProfile,
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

// React の `cache()` は引数ベースのメモ化を行うため、同一ファイル内で
// 引数なしの DAL 関数 (`getMyProfile`, `getMyRecentEpisodes`) を 2 回呼ぶと
// 2 回目以降は apiFetch が呼ばれずモックがフレークする。そのため:
// - 引数なし関数 (getMyProfile, getMyRecentEpisodes) は it() を 1 ケースに
//   統合する
// - 引数あり関数 (getMyListeningRecords) は呼び出しごとにユニークな
//   limit / offset を使う
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
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer jwt",
        }),
        cache: "no-store",
      }),
    );
  });

  // 「認証必須 DAL は認証ヘッダーが空でも事前 throw しない」共通挙動の検証。
  // (getMyProfile / getMyRecentEpisodes は引数なしで cache() メモ化のため
  //  ここではユニーク引数を取れる getMyListeningRecords で代表検証する)
  it("認証ヘッダーが空でも事前 throw せず apiFetch に委ねる", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({ records: [], total: 0 });

    // ユニークな limit (このファイル内で他のテストが使っていない値)
    await expect(getMyListeningRecords(999)).resolves.toBeDefined();
    expect(mockApiFetch).toHaveBeenCalled();
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

// --- mutation 関数のテスト ---
// createProfile は cache() でラップされていない通常の async 関数。

describe("createProfile", () => {
  it("POST /users/profile に認証付きで body を送る", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ id: "user-1", username: "testuser" });

    const data = { username: "testuser", display_name: "テストユーザー" };
    await createProfile(data);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/profile",
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

  it("認証ヘッダーが空でも事前 throw せず apiFetch に委ねる", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({});

    await expect(
      createProfile({ username: "guest-test", display_name: "Guest" }),
    ).resolves.toBeDefined();
    expect(mockApiFetch).toHaveBeenCalled();
  });
});
