import { serverGet } from "@/lib/api/server";
import { ApiRequestError } from "@/types/api";
import LoginPromptButton from "@/components/ui/LoginPromptButton";
import ListenButtonWithPrompt from "@/components/episode/ListenButtonWithPrompt";
import type { ListeningStatus } from "@/types/listening-record";

/**
 * 聴取ボタン。認証状態を API の成否で判定する。
 * 未ログイン（401）なら LoginPromptButton を表示し、
 * ログイン済みなら聴取状態に応じた ListenButton を表示する。
 * 500 系エラーは throw して ErrorBoundary に委譲する。
 * Suspense 境界の中で使う async Server Component。
 */
export default async function ListenButtonSection({ episodeId }: { episodeId: string }) {
  let status: ListeningStatus;

  try {
    status = await serverGet<ListeningStatus>(
      `/episodes/${encodeURIComponent(episodeId)}/listen`,
    );
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401) {
      // 未ログイン → ログインボタンを表示
      return <LoginPromptButton label="ログインして記録する" />;
    }
    // 500 系やネットワークエラーは ErrorBoundary に委譲
    throw err;
  }

  return (
    <ListenButtonWithPrompt
      episodeId={episodeId}
      initialListened={status.listened}
    />
  );
}
