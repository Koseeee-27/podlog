import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import GenreChips from "./GenreChips";
import type { Genre } from "@/types/genre";

const sampleGenres: Genre[] = [
  { id: "Comedy", name_en: "Comedy", name_ja: "コメディ" },
  { id: "News", name_en: "News", name_ja: "ニュース" },
  { id: "Sports", name_en: "Sports", name_ja: "スポーツ" },
  { id: "Technology", name_en: "Technology", name_ja: "テクノロジー" },
  { id: "Education", name_en: "Education", name_ja: "教育" },
  { id: "Business", name_en: "Business", name_ja: "ビジネス" },
  { id: "Health & Fitness", name_en: "Health & Fitness", name_ja: "健康/フィットネス" },
  { id: "Society & Culture", name_en: "Society & Culture", name_ja: "社会/文化" },
];

const meta = {
  title: "Discover/GenreChips",
  component: GenreChips,
  tags: ["autodocs"],
  args: {
    onSelect: () => {},
  },
} satisfies Meta<typeof GenreChips>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    genres: sampleGenres,
    selectedGenre: null,
  },
};

export const GenreSelected: Story = {
  args: {
    genres: sampleGenres,
    selectedGenre: "Comedy",
  },
};

export const Loading: Story = {
  args: {
    genres: [],
    selectedGenre: null,
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    genres: [],
    selectedGenre: null,
  },
};
