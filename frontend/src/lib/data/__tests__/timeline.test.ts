/**
 * timeline DAL のユニットテスト。
 */
import { getTimeline } from "../timeline";
import { apiFetch } from "@/lib/api/fetch";

jest.mock("@/lib/api/fetch", () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe("getTimeline", () => {
  it("limit / offset 指定時はクエリに乗せる", async () => {
    mockApiFetch.mockResolvedValueOnce({ reviews: [], total: 0 });

    await getTimeline(20, 0);

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

    await getTimeline();

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
