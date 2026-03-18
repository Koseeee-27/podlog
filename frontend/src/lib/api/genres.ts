import { apiGet } from "./client";
import type { Genre, GenreListResponse } from "@/types/genre";

export async function getGenres(): Promise<Genre[]> {
  const result = await apiGet<GenreListResponse>("/genres");
  return result.genres;
}
