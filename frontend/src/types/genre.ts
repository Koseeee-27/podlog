export interface Genre {
  id: string;
  name_en: string;
  name_ja: string;
}

export interface GenreListResponse {
  genres: Genre[];
}
