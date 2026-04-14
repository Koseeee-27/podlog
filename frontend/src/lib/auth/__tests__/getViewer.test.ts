/**
 * getViewer のユニットテスト。
 *
 * getAuthHeaders と apiFetch をモジュール単位でモックする。
 */
import { getViewer } from "../getViewer";
import { getAuthHeaders } from "../getAuthHeaders";
import { apiFetch } from "@/lib/api/fetch";
import { ApiRequestError } from "@/types/api";
import type { User } from "@/types/user";

jest.mock("../getAuthHeaders", () => ({
  getAuthHeaders: jest.fn(),
}));

jest.mock("@/lib/api/fetch", () => ({
  apiFetch: jest.fn(),
}));

const mockGetAuthHeaders = getAuthHeaders as jest.MockedFunction<
  typeof getAuthHeaders
>;
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  mockGetAuthHeaders.mockReset();
  mockApiFetch.mockReset();
});

const dummyUser: User = {
  id: "user-1",
  username: "alice",
  display_name: "Alice",
  avatar_url: null,
  bio: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("getViewer", () => {
  it("認証ヘッダーが空なら Supabase を呼ばずに guest を返す", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});

    const viewer = await getViewer();

    expect(viewer).toEqual({ status: "guest" });
    // API まで呼びに行かないことを確認 (最速パス)
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("200 が返ればプロフィール付きで authenticated を返す", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce(dummyUser);

    const viewer = await getViewer();

    expect(viewer).toEqual({ status: "authenticated", profile: dummyUser });

    // /users/me に Authorization ヘッダー付き + Content-Type + no-store で呼ばれる
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/me",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer jwt",
        }),
      }),
    );
  });

  it("401 が返れば guest を返す (JWT 期限切れ等)", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer expired" });
    mockApiFetch.mockRejectedValueOnce(new ApiRequestError(401, "unauthorized"));

    const viewer = await getViewer();

    expect(viewer).toEqual({ status: "guest" });
  });

  it("404 が返れば no_profile を返す (初回ログイン直後でプロフィール未作成)", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockRejectedValueOnce(new ApiRequestError(404, "not found"));

    const viewer = await getViewer();

    expect(viewer).toEqual({ status: "no_profile" });
  });

  it("500 は握りつぶさず呼び出し側に throw する", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    const err = new ApiRequestError(500, "internal");
    mockApiFetch.mockRejectedValueOnce(err);

    await expect(getViewer()).rejects.toBe(err);
  });

  it("ApiRequestError 以外の例外はそのまま投げる", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    const err = new TypeError("network boom");
    mockApiFetch.mockRejectedValueOnce(err);

    await expect(getViewer()).rejects.toBe(err);
  });

  it("getAuthHeaders が throw した場合も呼び出し側に投げる", async () => {
    const err = new Error("auth headers boom");
    mockGetAuthHeaders.mockRejectedValueOnce(err);

    await expect(getViewer()).rejects.toBe(err);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
