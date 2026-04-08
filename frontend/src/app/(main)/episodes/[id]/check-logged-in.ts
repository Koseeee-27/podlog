import { cache } from "react";
import { serverGet } from "@/lib/api/server";

/**
 * serverGet("/users/me") の成否でログイン判定。
 * cache() で同一レンダリングサイクル内の重複呼び出しをメモ化する。
 */
const checkLoggedIn = cache(async (): Promise<boolean> => {
  try {
    await serverGet<unknown>("/users/me");
    return true;
  } catch {
    return false;
  }
});

export { checkLoggedIn };
