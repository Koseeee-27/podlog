import { serverGet } from "@/lib/api/server";
import LoginPromptButton from "@/components/ui/LoginPromptButton";
import ListenButtonWithPrompt from "@/components/episode/ListenButtonWithPrompt";
import type { ListeningStatus } from "@/types/listening-record";

/**
 * 聴取ボタン。認証状態を API の成否で判定する。
 * 未ログイン（401）なら LoginPromptButton を表示し、
 * ログイン済みなら聴取状態に応じた ListenButton を表示する。
 * Suspense 境界の中で使う async Server Component。
 */
export default async function ListenButtonSection({ episodeId }: { episodeId: string }) {
  const status = await serverGet<ListeningStatus>(
    `/episodes/${encodeURIComponent(episodeId)}/listen`,
  ).catch(() => null);

  // 取得失敗（401: 未ログイン、その他エラー）→ ログインボタンを表示
  if (!status) {
    return <LoginPromptButton label="ログインして記録する" />;
  }

  return (
    <ListenButtonWithPrompt
      episodeId={episodeId}
      initialListened={status.listened}
    />
  );
}
