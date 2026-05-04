import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EpisodeListClient from "./EpisodeListClient";
import { getEpisodesByPodcast } from "@/lib/api/episodes";
import type { EpisodeListItem } from "@/types/episode";

// API クライアントをモックして、loadMore の挙動を制御する。
jest.mock("@/lib/api/episodes", () => ({
  __esModule: true,
  getEpisodesByPodcast: jest.fn(),
}));

const mockedGetEpisodesByPodcast = getEpisodesByPodcast as jest.MockedFunction<
  typeof getEpisodesByPodcast
>;

function makeEpisodes(count: number, offset = 0): EpisodeListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ep-${offset + i + 1}`,
    title: `Episode ${offset + i + 1}`,
    description: null,
    duration_ms: null,
    published_at: null,
    average_rating: 0,
    total_ratings: 0,
  }));
}

describe("EpisodeListClient", () => {
  beforeEach(() => {
    mockedGetEpisodesByPodcast.mockReset();
  });

  // --- 回帰防止 ---
  // 総件数がちょうど PAGE_SIZE (= 20) の倍数のとき、
  // 旧実装では `initialEpisodes.length >= PAGE_SIZE` で判定していたため、
  // 「もっと読み込む」ボタンが表示され 1 回空振りクリックされていた。
  // total ベースの判定に変えたことで非表示になることを保証する。
  it("総件数がちょうど 20 のとき「もっと読み込む」ボタンが表示されない（回帰防止）", () => {
    render(
      <EpisodeListClient
        podcastId="pod-1"
        initialEpisodes={makeEpisodes(20)}
        initialTotal={20}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "もっと読み込む" }),
    ).not.toBeInTheDocument();
  });

  it("総件数が 25 のとき「もっと読み込む」ボタンが表示される", () => {
    render(
      <EpisodeListClient
        podcastId="pod-1"
        initialEpisodes={makeEpisodes(20)}
        initialTotal={25}
      />,
    );

    expect(
      screen.getByRole("button", { name: "もっと読み込む" }),
    ).toBeInTheDocument();
  });

  it("loadMore 成功後、全件取得し終えたら「もっと読み込む」ボタンが非表示になる", async () => {
    const user = userEvent.setup();
    mockedGetEpisodesByPodcast.mockResolvedValueOnce({
      episodes: makeEpisodes(5, 20),
      total: 25,
    });

    render(
      <EpisodeListClient
        podcastId="pod-1"
        initialEpisodes={makeEpisodes(20)}
        initialTotal={25}
      />,
    );

    const loadMoreButton = screen.getByRole("button", {
      name: "もっと読み込む",
    });
    await user.click(loadMoreButton);

    // loadMore 完了後、episodes.length === total になりボタンは消える
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "もっと読み込む" }),
      ).not.toBeInTheDocument();
    });
    expect(mockedGetEpisodesByPodcast).toHaveBeenCalledWith("pod-1", {
      limit: 20,
      offset: 20,
    });
  });

  it("loadMore 失敗時にエラーメッセージを表示し、リトライで復帰する", async () => {
    const user = userEvent.setup();
    // 1 回目: 失敗 / 2 回目（リトライ）: 成功
    mockedGetEpisodesByPodcast
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({
        episodes: makeEpisodes(5, 20),
        total: 25,
      });

    render(
      <EpisodeListClient
        podcastId="pod-1"
        initialEpisodes={makeEpisodes(20)}
        initialTotal={25}
      />,
    );

    await user.click(screen.getByRole("button", { name: "もっと読み込む" }));

    // エラー発生後、エラーメッセージとリトライボタンが表示される。
    // さらに `hasMore && !loadMoreError` により「もっと読み込む」は非表示になる。
    await waitFor(() => {
      expect(
        screen.getByText("追加の読み込みに失敗しました"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "もっと読み込む" }),
    ).not.toBeInTheDocument();

    // リトライで成功させると、エラー表示が消え、全件読み終わってボタンも消える
    await user.click(screen.getByRole("button", { name: "再試行" }));

    await waitFor(() => {
      expect(
        screen.queryByText("追加の読み込みに失敗しました"),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "もっと読み込む" }),
    ).not.toBeInTheDocument();
    expect(mockedGetEpisodesByPodcast).toHaveBeenCalledTimes(2);
  });
});
