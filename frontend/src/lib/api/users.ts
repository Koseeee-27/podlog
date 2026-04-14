import { apiGet, apiPost, apiPut, apiUpload } from "./client";
import type { User, UserPublicProfile, CreateProfileRequest, UpdateProfileRequest, FavoritePodcastListResult, AvatarUploadResult } from "@/types/user";
import type { ListeningRecordListResult } from "@/types/listening-record";
import type { UserReviewListResult } from "@/types/review";

export function createProfile(data: CreateProfileRequest): Promise<User> {
  return apiPost<User>("/users/profile", data);
}

export function getMyProfile(): Promise<User> {
  return apiGet<User>("/users/me");
}

export function updateMyProfile(data: UpdateProfileRequest): Promise<User> {
  return apiPut<User>("/users/me", data);
}

export function uploadAvatar(file: File): Promise<AvatarUploadResult> {
  const formData = new FormData();
  formData.append("avatar", file);
  return apiUpload<AvatarUploadResult>("/users/me/avatar", formData);
}

export function getPublicProfile(username: string): Promise<UserPublicProfile> {
  return apiGet<UserPublicProfile>(`/users/${encodeURIComponent(username)}`);
}

// 好きな番組の GET は Server Component で DAL (`lib/data/users.ts`) を直接
// 呼ぶため、クライアント側のラッパーは提供しない
// (FE 規約: useEffect + fetch 禁止)。

export function updateMyFavoritePodcasts(podcastIds: string[]): Promise<FavoritePodcastListResult> {
  return apiPut<FavoritePodcastListResult>("/users/me/favorite-podcasts", { podcast_ids: podcastIds });
}

/**
 * ユーザーの聴取記録一覧をクライアントから取得する (公開 API)。
 *
 * Client Component の「もっと見る」ページネーション用。
 * SSR 初期取得は `lib/data/users.ts` の `getUserListeningRecords` を使うこと。
 *
 * FE 規約「ユーザー操作による追加データ取得はクライアント API で直接行う」
 * に従い、Server Action ではなくここに置く。
 */
export function fetchUserListeningRecords(
  username: string,
  limit: number,
  offset: number,
): Promise<ListeningRecordListResult> {
  const search = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiGet<ListeningRecordListResult>(
    `/users/${encodeURIComponent(username)}/listening-records?${search.toString()}`,
  );
}

/**
 * ユーザーのレビュー一覧をクライアントから取得する (公開 API)。
 *
 * Client Component の「もっと見る」ページネーション用。
 * SSR 初期取得は `lib/data/users.ts` の `getUserReviews` を使うこと。
 */
export function fetchUserReviews(
  username: string,
  limit: number,
  offset: number,
): Promise<UserReviewListResult> {
  const search = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiGet<UserReviewListResult>(
    `/users/${encodeURIComponent(username)}/reviews?${search.toString()}`,
  );
}
