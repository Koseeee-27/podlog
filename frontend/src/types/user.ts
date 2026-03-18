export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileRequest {
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
}

export interface UpdateProfileRequest {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export interface UserPublicProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface FavoritePodcastItem {
  id: string;
  title: string;
  artwork_url?: string;
}

export interface FavoritePodcastListResult {
  podcasts: FavoritePodcastItem[];
}

export interface AvatarUploadResult {
  avatar_url: string;
}
