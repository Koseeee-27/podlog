"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/podcast/SearchBar";

interface DiscoverSearchBarProps {
  initialQuery: string;
}

export default function DiscoverSearchBar({
  initialQuery,
}: DiscoverSearchBarProps) {
  const [inputValue, setInputValue] = useState(initialQuery);
  const router = useRouter();

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      router.push(`/discover?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleChange = (value: string) => {
    setInputValue(value);
    if (!value.trim() && initialQuery) {
      router.replace("/discover");
    }
  };

  return (
    <SearchBar
      value={inputValue}
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
}
