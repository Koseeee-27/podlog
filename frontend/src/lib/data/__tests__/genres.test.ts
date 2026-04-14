/**
 * genres DAL のユニットテスト。
 * apiFetch をモジュール単位でモックする。
 */
import { getGenres } from "../genres";
import { apiFetch } from "@/lib/api/fetch";
import type { GenreListResponse } from "@/types/genre";

jest.mock("@/lib/api/fetch", () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  mockApiFetch.mockReset();
});

const dummyGenres: GenreListResponse = {
  genres: [
    { id: "news", name_en: "News", name_ja: "ニュース" },
    { id: "tech", name_en: "Technology", name_ja: "テクノロジー" },
  ],
};

describe("getGenres", () => {
  it("/genres を Content-Type + revalidate 300 で呼ぶ", async () => {
    mockApiFetch.mockResolvedValueOnce(dummyGenres);

    const result = await getGenres();

    expect(result).toEqual(dummyGenres);
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/genres",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 300 },
      }),
    );
  });
});
