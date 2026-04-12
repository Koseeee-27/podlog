import { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PodcastEpisodeList from "./PodcastEpisodeList";
import { getEpisodesByPodcast } from "@/lib/api/episodes";
import type { EpisodeListItem, EpisodeListResult } from "@/types/episode";
import type { PodcastSearchItem } from "@/types/podcast";

// API クライアントをモックして、loadMore の挙動を制御する。
jest.mock("@/lib/api/episodes", () => ({
  __esModule: true,
  getEpisodesByPodcast: jest.fn(),
}));

// next/image は jsdom 環境では直接レンダリングできないため単純な img に置き換える。
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={props.src} alt={props.alt} />;
  },
}));

// EpisodeCard は内部で ListenButton → useToast に依存しており、
// ToastProvider なしで render するとエラーになる。
// 本テストの関心事は「もっと見る」ボタンの表示制御であって EpisodeCard の中身ではないため、
// タイトルだけ表示する軽量なモックに置き換える。
jest.mock("@/components/episode/EpisodeCard", () => ({
  __esModule: true,
  default: ({ episode }: { episode: { id: string; title: string } }) => (
    <div data-testid={`episode-card-${episode.id}`}>{episode.title}</div>
  ),
}));

const mockedGetEpisodesByPodcast = getEpisodesByPodcast as jest.MockedFunction<
  typeof getEpisodesByPodcast
>;

const podcast: PodcastSearchItem = {
  id: "pod-1",
  title: "Test Podcast",
  author: null,
  artwork_url: null,
  average_rating: 0,
  total_reviews: 0,
  favorite_count: 0,
};

function makeEpisodes(count: number, offset = 0): EpisodeListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ep-${offset + i + 1}`,
    title: `Episode ${offset + i + 1}`,
    description: null,
    duration_ms: null,
    published_at: null,
    average_rating: 0,
    total_reviews: 0,
  }));
}

/**
 * `use(promise)` 用の fulfilled 済み thenable を作る。
 *
 * React 19 の `use()` は、thenable に `status === "fulfilled"` と `value` が
 * セットされていれば同期的に値を返す。テストでは Suspense の非同期解決に
 * 依存せず、初回レンダリングから同期的に解決させたいのでこの形を使う。
 */
type TrackedPromise<T> = Promise<T> & { status: "fulfilled"; value: T };
function fulfilledPromise<T>(value: T): TrackedPromise<T> {
  const p = Promise.resolve(value) as TrackedPromise<T>;
  p.status = "fulfilled";
  p.value = value;
  return p;
}

function renderWithSuspense(initialDataPromise: Promise<EpisodeListResult>) {
  return render(
    <Suspense fallback={<div>loading</div>}>
      <PodcastEpisodeList
        podcast={podcast}
        initialDataPromise={initialDataPromise}
        onBack={() => {}}
      />
    </Suspense>,
  );
}

describe("PodcastEpisodeList", () => {
  beforeEach(() => {
    mockedGetEpisodesByPodcast.mockReset();
  });

  // --- 回帰防止 ---
  // 総件数がちょうど PAGE_SIZE (= 20) の倍数のとき、
  // 旧実装では `initialEpisodes.length >= PAGE_SIZE` で判定していたため、
  // 「もっと見る」ボタンが表示され 1 回空振りクリックされていた。
  it("総件数がちょうど 20 のとき「もっと見る」ボタンが表示されない（回帰防止）", () => {
    renderWithSuspense(
      fulfilledPromise({ episodes: makeEpisodes(20), total: 20 }),
    );

    expect(screen.getByText("Episode 1")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "もっと見る" }),
    ).not.toBeInTheDocument();
  });

  it("総件数が 25 のとき「もっと見る」ボタンが表示される", () => {
    renderWithSuspense(
      fulfilledPromise({ episodes: makeEpisodes(20), total: 25 }),
    );

    expect(
      screen.getByRole("button", { name: "もっと見る" }),
    ).toBeInTheDocument();
  });

  it("loadMore 成功後、全件取得し終えたら「もっと見る」ボタンが非表示になる", async () => {
    const user = userEvent.setup();
    mockedGetEpisodesByPodcast.mockResolvedValueOnce({
      episodes: makeEpisodes(5, 20),
      total: 25,
    });

    renderWithSuspense(
      fulfilledPromise({ episodes: makeEpisodes(20), total: 25 }),
    );

    const loadMoreButton = screen.getByRole("button", {
      name: "もっと見る",
    });
    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "もっと見る" }),
      ).not.toBeInTheDocument();
    });
    expect(mockedGetEpisodesByPodcast).toHaveBeenCalledWith("pod-1", {
      limit: 20,
      offset: 20,
    });
  });

  it("loadMore 失敗時にエラーメッセージを表示し、再クリックで復帰する", async () => {
    const user = userEvent.setup();
    // 1 回目: 失敗 / 2 回目: 成功
    mockedGetEpisodesByPodcast
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({
        episodes: makeEpisodes(5, 20),
        total: 25,
      });

    renderWithSuspense(
      fulfilledPromise({ episodes: makeEpisodes(20), total: 25 }),
    );

    await user.click(screen.getByRole("button", { name: "もっと見る" }));

    // エラーメッセージが表示される（getUserFriendlyErrorMessage のフォールバック）。
    // PodcastEpisodeList では ErrorMessage に onRetry を渡していないため、
    // 「もっと見る」ボタンは消えず、ユーザーは同じボタンで再試行する。
    await waitFor(() => {
      expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "もっと見る" }),
    ).toBeInTheDocument();

    // 再クリックで成功させ、エラー表示が消え、全件取得済みになりボタンが消える
    await user.click(screen.getByRole("button", { name: "もっと見る" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "もっと見る" }),
      ).not.toBeInTheDocument();
    });
    expect(mockedGetEpisodesByPodcast).toHaveBeenCalledTimes(2);
  });
});
