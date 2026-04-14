import { apiFetch } from "../fetch";
import { ApiRequestError } from "@/types/api";

// グローバル fetch を毎テストでモックする
const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  // リトライ時の console.warn を抑制
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  // リトライ時の setTimeout を即時に進めるため fake timers を使う
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/**
 * jsdom には `Response` グローバルが無いため、apiFetch が実際に使う
 * プロパティだけを持つ軽量スタブを返す (status / ok / json / body).
 */
interface FakeResponse {
  status: number;
  ok: boolean;
  json(): Promise<unknown>;
  body: { cancel(): Promise<void> } | null;
}

function jsonResponse<T>(status: number, body: T): FakeResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    body: { cancel: async () => undefined },
  };
}

function emptyResponse(status: number): FakeResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => ({}),
    body: null,
  };
}

function nonJsonErrorResponse(status: number): FakeResponse {
  return {
    status,
    ok: false,
    json: async () => {
      throw new SyntaxError("not json");
    },
    body: { cancel: async () => undefined },
  };
}

/**
 * apiFetch は内部で `await setTimeout` を挟むため、fake timers 下で
 * テストから解決させるには `runAllTimersAsync()` を並行して回す必要がある。
 */
async function flushRetryDelay() {
  await jest.runAllTimersAsync();
}

describe("apiFetch", () => {
  it("GET 成功時に JSON をパースして返す", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { id: "abc" }));

    const result = await apiFetch<{ id: string }>("/users/me");

    expect(result).toEqual({ id: "abc" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/users\/me$/);
    // method を指定しない場合は undefined で渡る (fetch のデフォルトは GET)
    expect(init?.method).toBeUndefined();
  });

  it("POST 成功時に JSON をパースして返す", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(201, { id: "created" }));

    const result = await apiFetch<{ id: string }>("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });

    expect(result).toEqual({ id: "created" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("204 No Content はボディなしで undefined を返す", async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse(204));

    const result = await apiFetch<void>("/records/1", { method: "DELETE" });

    expect(result).toBeUndefined();
  });

  it("401 は ApiRequestError(401) として throw する", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(401, { error: "unauthorized" }));

    await expect(apiFetch("/users/me")).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 401,
      message: "unauthorized",
    });
    expect(mockFetch).toHaveBeenCalledTimes(1); // 401 はリトライしない
  });

  it("404 は ApiRequestError(404) として throw する", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(404, { error: "not found" }));

    await expect(apiFetch("/users/me")).rejects.toBeInstanceOf(ApiRequestError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("GET の 500 は 1 回だけリトライし、成功すれば結果を返す", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(500, { error: "internal" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const promise = apiFetch<{ ok: boolean }>("/podcasts");
    await flushRetryDelay();
    const result = await promise;

    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("GET の 500 リトライにも失敗したら ApiRequestError を throw する", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(500, { error: "internal" }))
      .mockResolvedValueOnce(jsonResponse(500, { error: "internal" }));

    // fake timers 下では `flushRetryDelay()` を待つ前に rejection ハンドラを
    // attach しておかないと「unhandled rejection」として扱われてしまう。
    const promise = apiFetch("/podcasts");
    const assertion = expect(promise).rejects.toMatchObject({ status: 500 });
    await flushRetryDelay();
    await assertion;

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("POST の 500 はリトライしない", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(500, { error: "internal" }));

    await expect(
      apiFetch("/users", { method: "POST", body: "{}" }),
    ).rejects.toMatchObject({ status: 500 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("GET のネットワークエラーは 1 回リトライする", async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError("network error"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const promise = apiFetch<{ ok: boolean }>("/podcasts");
    await flushRetryDelay();
    const result = await promise;

    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("POST のネットワークエラーはリトライせずそのまま throw する", async () => {
    const err = new TypeError("network error");
    mockFetch.mockRejectedValueOnce(err);

    await expect(
      apiFetch("/users", { method: "POST", body: "{}" }),
    ).rejects.toBe(err);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("エラーレスポンスが JSON でない場合は 'Unknown error' をメッセージにする", async () => {
    mockFetch.mockResolvedValueOnce(nonJsonErrorResponse(500));
    mockFetch.mockResolvedValueOnce(nonJsonErrorResponse(500));

    const promise = apiFetch("/podcasts");
    const assertion = expect(promise).rejects.toMatchObject({
      status: 500,
      message: "Unknown error",
    });
    await flushRetryDelay();
    await assertion;
  });
});
