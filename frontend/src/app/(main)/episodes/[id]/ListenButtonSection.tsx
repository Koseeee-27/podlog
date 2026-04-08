import { serverGet } from "@/lib/api/server";
import LoginPromptButton from "@/components/ui/LoginPromptButton";
import ListenButtonWithPrompt from "@/components/episode/ListenButtonWithPrompt";
import { checkLoggedIn } from "./check-logged-in";
import type { ListeningStatus } from "@/types/listening-record";

/**
 * 聴取ボタン。認証状態を Server で取得して表示を分岐する。
 * Suspense 境界の中で使う async Server Component。
 */
export default async function ListenButtonSection({ episodeId }: { episodeId: string }) {
  const isLoggedIn = await checkLoggedIn();

  if (!isLoggedIn) {
    return <LoginPromptButton label="ログインして記録する" />;
  }

  let listened = false;
  try {
    const status = await serverGet<ListeningStatus>(
      `/episodes/${encodeURIComponent(episodeId)}/listen`,
    );
    listened = status.listened;
  } catch (err) {
    console.warn("[ListenButtonSection] 聴取状態の取得に失敗:", err);
  }

  return (
    <ListenButtonWithPrompt
      episodeId={episodeId}
      initialListened={listened}
    />
  );
}
