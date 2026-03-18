import { apiGet, apiPost, apiPut, apiUpload } from "./client";
import type { User, UserPublicProfile, CreateProfileRequest, UpdateProfileRequest, FavoritePodcastListResult, AvatarUploadResult } from "@/types/user";

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

export function getUserFavoritePodcasts(username: string): Promise<FavoritePodcastListResult> {
  return apiGet<FavoritePodcastListResult>(`/users/${encodeURIComponent(username)}/favorite-podcasts`);
}

export function updateMyFavoritePodcasts(podcastIds: string[]): Promise<FavoritePodcastListResult> {
  return apiPut<FavoritePodcastListResult>("/users/me/favorite-podcasts", { podcast_ids: podcastIds });
}
