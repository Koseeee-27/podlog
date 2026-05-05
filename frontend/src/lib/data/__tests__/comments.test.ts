/**
 * comments DAL のユニットテスト。
 *
 * 既存 `ratings.test.ts` のパターンを踏襲。
 *
 * 注意: DAL 関数は React `cache()` でラップされているため、同一テストファイル
 * 内で同じ引数を複数回渡すと 2 回目以降 `apiFetch` が呼ばれない（リクエスト
 * スコープのメモ化）。各テストでユニークな id / クエリパラメータを使うか、
 * 別関数を呼ぶことでメモ化のヒットを避けている。
 */
import {
  getEpisodeComments,
  getMyComments,
  getUserComments,
  getTimeline,
  createComment,
  updateMyComment,
  deleteMyComment,
} from "../comments";
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

describe("getEpisodeComments", () => {
  it("公開エンドポイントなので Authorization なし + revalidate: 0 で呼ぶ", async () => {
    mockApiFetch.mockResolvedValueOnce({ comments: [], total: 0 });

    await getEpisodeComments("episode-list-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/episode-list-1/comments",
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

  it("limit / offset 指定時はクエリに乗せる", async () => {
    mockApiFetch.mockResolvedValueOnce({ comments: [], total: 0 });

    await getEpisodeComments("episode-list-2", 30, 60);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/episode-list-2/comments?limit=30&offset=60",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      }),
    );
  });

  it("episodeId を encodeURIComponent する", async () => {
    mockApiFetch.mockResolvedValueOnce({ comments: [], total: 0 });

    await getEpisodeComments("ep with/slash-list");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/ep%20with%2Fslash-list/comments",
      expect.any(Object),
    );
  });
});

describe("getMyComments", () => {
  it("認証ヘッダー付き + cache: no-store で呼ぶ", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ comments: [], total: 0 });

    await getMyComments();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/me/comments",
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

  it("limit / offset 指定時はクエリに乗せる", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({ comments: [], total: 0 });

    await getMyComments(20, 40);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/me/comments?limit=20&offset=40",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );
  });
});

describe("getUserComments", () => {
  it("公開エンドポイントなので Authorization なし + revalidate: 0 で呼ぶ", async () => {
    mockApiFetch.mockResolvedValueOnce({ comments: [], total: 0 });

    await getUserComments("alice");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/alice/comments",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      }),
    );
    const init = mockApiFetch.mock.calls[0][1];
    expect(init?.headers).not.toHaveProperty("Authorization");
  });

  it("username を encodeURIComponent する", async () => {
    mockApiFetch.mockResolvedValueOnce({ comments: [], total: 0 });

    await getUserComments("user with space");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/user%20with%20space/comments",
      expect.any(Object),
    );
  });

  it("limit / offset 指定時はクエリに乗せる", async () => {
    mockApiFetch.mockResolvedValueOnce({ comments: [], total: 0 });

    await getUserComments("bob", 10, 20);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/users/bob/comments?limit=10&offset=20",
      expect.objectContaining({
        method: "GET",
        next: { revalidate: 0 },
      }),
    );
  });
});

describe("getTimeline", () => {
  it("公開エンドポイントなので Authorization なし + revalidate: 60 + tags で呼ぶ", async () => {
    mockApiFetch.mockResolvedValueOnce({ comments: [], total: 0 });

    await getTimeline();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/timeline",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60, tags: ["timeline"] },
      }),
    );
  });

  it("limit / offset 指定時はクエリに乗せる", async () => {
    mockApiFetch.mockResolvedValueOnce({ comments: [], total: 0 });

    await getTimeline(20, 40);

    // クエリ省略時 / 指定時どちらでも fetch オプション (revalidate / tags) の
    // 退行を取りこぼさないよう、URL だけでなく next の中身まで明示検証する
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/timeline?limit=20&offset=40",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60, tags: ["timeline"] },
      }),
    );
  });
});

describe("createComment", () => {
  it("POST で認証ヘッダー付き + JSON body を送る", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({});

    await createComment("episode-create-1", { body: "面白かった！" });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/episode-create-1/comments",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer jwt",
        }),
        body: JSON.stringify({ body: "面白かった！" }),
      }),
    );
  });

  it("episodeId を encodeURIComponent する", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({});

    await createComment("ep with/slash-create", { body: "test" });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/episodes/ep%20with%2Fslash-create/comments",
      expect.any(Object),
    );
  });
});

describe("updateMyComment", () => {
  it("PUT で /comments/:id（commentId をパスに含む）+ 認証ヘッダー + JSON body を送る", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce({});

    await updateMyComment("comment-update-1", { body: "更新後の感想" });

    // rating の `/episodes/:id/ratings/mine` パターンと違い、commentId をパスに含む
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/comments/comment-update-1",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer jwt",
        }),
        body: JSON.stringify({ body: "更新後の感想" }),
      }),
    );
  });

  it("commentId を encodeURIComponent する", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce({});

    await updateMyComment("c with/slash-update", { body: "x" });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/comments/c%20with%2Fslash-update",
      expect.any(Object),
    );
  });
});

describe("deleteMyComment", () => {
  it("DELETE で /comments/:id + 認証ヘッダーのみ送る（Content-Type は付けない）", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({ Authorization: "Bearer jwt" });
    mockApiFetch.mockResolvedValueOnce(undefined);

    await deleteMyComment("comment-delete-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/comments/comment-delete-1",
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer jwt" },
      }),
    );
    // body を送らない
    const init = mockApiFetch.mock.calls[0][1];
    expect(init).not.toHaveProperty("body");
    // DELETE では Content-Type を付けない（PodLog API 規約、ratings DAL と整合）
    expect(init?.headers).not.toHaveProperty("Content-Type");
  });

  it("commentId を encodeURIComponent する", async () => {
    mockGetAuthHeaders.mockResolvedValueOnce({});
    mockApiFetch.mockResolvedValueOnce(undefined);

    await deleteMyComment("c with/slash-delete");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/comments/c%20with%2Fslash-delete",
      expect.any(Object),
    );
  });
});
