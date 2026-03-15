import { apiGet, apiPost, apiPut } from "./client";
import type { User, UserPublicProfile, CreateProfileRequest, UpdateProfileRequest, FavoritePodcastListResult } from "@/types/user";

export function createProfile(data: CreateProfileRequest): Promise<User> {
  return apiPost<User>("/users/profile", data);
}

export function getMyProfile(): Promise<User> {
  return apiGet<User>("/users/me");
}

export function updateMyProfile(data: UpdateProfileRequest): Promise<User> {
  return apiPut<User>("/users/me", data);
}

export function getPublicProfile(username: string): Promise<UserPublicProfile> {
  return apiGet<UserPublicProfile>(`/users/${encodeURIComponent(username)}`);
}

export function getUserFavoritePodcasts(username: string): Promise<FavoritePodcastListResult> {
  return apiGet<FavoritePodcastListResult>(`/users/${encodeURIComponent(username)}/favorite-podcasts`);
}
