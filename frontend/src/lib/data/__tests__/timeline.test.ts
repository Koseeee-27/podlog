/**
 * 旧 timeline DAL（`getOldTimeline`）のユニットテスト。
 *
 * 過渡期メモ: 新モデルの `getTimeline`（`lib/data/comments.ts`）に対する
 * テストは別ファイル（`__tests__/comments.test.ts` 想定）で扱う。
 * 本テストは P-9 で旧 DAL ごと削除される。
 */
import { getOldTimeline } from "../timeline";
import { apiFetch } from "@/lib/api/fetch";

jest.mock("@/lib/api/fetch", () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe("getOldTimeline", () => {
  it("limit / offset 指定時はクエリに乗せる", async () => {
    mockApiFetch.mockResolvedValueOnce({ reviews: [], total: 0 });

    await getOldTimeline(20, 0);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/timeline?limit=20&offset=0",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60, tags: ["timeline"] },
      }),
    );
  });

  it("limit / offset 省略時はクエリなし", async () => {
    mockApiFetch.mockResolvedValueOnce({ reviews: [], total: 0 });

    await getOldTimeline();

    // クエリ省略時でも fetch オプション (revalidate / tags) の退行を
    // 取りこぼさないよう、URL だけでなく next の中身まで明示検証する。
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/timeline",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60, tags: ["timeline"] },
      }),
    );
  });
});
