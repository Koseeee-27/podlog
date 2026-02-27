import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window === "undefined") {
    throw new Error(
      "createClient() はブラウザ環境でのみ使用できます。サーバー側では server.ts の createClient を使用してください。"
    );
  }

  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  client = createBrowserClient(url, key);
  return client;
}
