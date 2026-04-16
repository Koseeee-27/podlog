/**
 * Podcast Requests ドメインの Data Access Layer (DAL)。
 *
 * ユーザーからの番組追加リクエスト (`/podcasts/request`) を作成する
 * mutation を集約する。GET 系は現状存在しない (将来管理画面側で追加する
 * 可能性があるが本ファイルに併置する)。
 *
 * 全エンドポイント認証必須。DAL 側では 401 を事前判定せず、呼び出し側
 * (Server Action) で `ApiRequestError` を catch して `{ success: false, error }`
 * 形式でフォームに返す (FE 規約)。
 */
import "server-only";
import { apiFetch } from "@/lib/api/fetch";
import { getAuthHeaders } from "@/lib/auth/getAuthHeaders";
import type {
  CreatePodcastRequestInput,
  PodcastRequestResult,
} from "@/types/podcast-request";

/**
 * 番組追加リクエストを作成する (認証必須)。
 * `POST /podcasts/request`。
 */
export async function createPodcastRequest(
  data: CreatePodcastRequestInput,
): Promise<PodcastRequestResult> {
  const authHeaders = await getAuthHeaders();
  return apiFetch<PodcastRequestResult>("/podcasts/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(data),
  });
}
