/**
 * getAuthHeaders のユニットテスト。
 *
 * next/headers の `cookies()` と `@/lib/supabase/server` の `createClient()` を
 * モジュール単位でモックする。
 */
import { getAuthHeaders } from "../getAuthHeaders";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

/**
 * 最小限の cookieStore モック。`getAll()` のみ使われる。
 */
function makeCookieStore(cookieList: Array<{ name: string; value: string }>) {
  return {
    getAll: () => cookieList,
  } as unknown as Awaited<ReturnType<typeof cookies>>;
}

/**
 * 最小限の Supabase クライアントモック。`auth.getSession()` のみ使われる。
 */
function makeSupabase(
  getSession: () => Promise<{
    data: { session: { access_token: string } | null };
  }>,
) {
  return {
    auth: { getSession },
  } as unknown as Awaited<ReturnType<typeof createClient>>;
}

beforeEach(() => {
  mockCookies.mockReset();
  mockCreateClient.mockReset();
});

describe("getAuthHeaders", () => {
  it("Supabase の認証 Cookie が無ければ空オブジェクトを返す (最速パス)", async () => {
    mockCookies.mockResolvedValueOnce(
      makeCookieStore([
        { name: "other-cookie", value: "x" },
        { name: "theme", value: "dark" },
      ]),
    );

    const headers = await getAuthHeaders();

    expect(headers).toEqual({});
    // 最速パスで Supabase クライアントが生成されないことを確認
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("Cookie は無く cookieStore が空でも空オブジェクトを返す", async () => {
    mockCookies.mockResolvedValueOnce(makeCookieStore([]));

    const headers = await getAuthHeaders();

    expect(headers).toEqual({});
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("sb- Cookie がありセッションが取れれば Authorization ヘッダーを返す", async () => {
    mockCookies.mockResolvedValueOnce(
      makeCookieStore([{ name: "sb-access-token", value: "cookie-value" }]),
    );
    mockCreateClient.mockResolvedValueOnce(
      makeSupabase(async () => ({
        data: { session: { access_token: "jwt-token-123" } },
      })),
    );

    const headers = await getAuthHeaders();

    expect(headers).toEqual({ Authorization: "Bearer jwt-token-123" });
  });

  it("sb- Cookie はあるがセッションが null なら空オブジェクトを返す", async () => {
    mockCookies.mockResolvedValueOnce(
      makeCookieStore([{ name: "sb-access-token", value: "stale" }]),
    );
    mockCreateClient.mockResolvedValueOnce(
      makeSupabase(async () => ({ data: { session: null } })),
    );

    const headers = await getAuthHeaders();

    expect(headers).toEqual({});
  });

  it("sb- Cookie はあるが access_token が欠けていれば空オブジェクトを返す", async () => {
    mockCookies.mockResolvedValueOnce(
      makeCookieStore([{ name: "sb-access-token", value: "x" }]),
    );
    mockCreateClient.mockResolvedValueOnce(
      makeSupabase(
        async () =>
          ({
            data: { session: { access_token: "" } },
          }) as { data: { session: { access_token: string } | null } },
      ),
    );

    const headers = await getAuthHeaders();

    expect(headers).toEqual({});
  });

  it("Supabase クライアント生成が throw したら握りつぶさず投げる", async () => {
    mockCookies.mockResolvedValueOnce(
      makeCookieStore([{ name: "sb-access-token", value: "x" }]),
    );
    const err = new Error("supabase boom");
    mockCreateClient.mockRejectedValueOnce(err);

    await expect(getAuthHeaders()).rejects.toBe(err);
  });

  it("getSession() 自体が throw したら握りつぶさず投げる", async () => {
    mockCookies.mockResolvedValueOnce(
      makeCookieStore([{ name: "sb-access-token", value: "x" }]),
    );
    const err = new Error("session boom");
    mockCreateClient.mockResolvedValueOnce(
      makeSupabase(async () => {
        throw err;
      }),
    );

    await expect(getAuthHeaders()).rejects.toBe(err);
  });

  it("戻り値が Record<string, string> として narrow されている (in 演算子が使える)", async () => {
    mockCookies.mockResolvedValueOnce(
      makeCookieStore([{ name: "sb-access-token", value: "x" }]),
    );
    mockCreateClient.mockResolvedValueOnce(
      makeSupabase(async () => ({
        data: { session: { access_token: "jwt" } },
      })),
    );

    const headers = await getAuthHeaders();

    // narrow が効いているため `in` 演算子が誤作動しないことを確認
    expect("Authorization" in headers).toBe(true);
    expect(headers.Authorization).toBe("Bearer jwt");
  });
});
