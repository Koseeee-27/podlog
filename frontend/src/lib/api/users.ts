import { apiGet, apiPost, apiPut } from "./client";
import type { User, UserPublicProfile, CreateProfileRequest, UpdateProfileRequest } from "@/types/user";

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
