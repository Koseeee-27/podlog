"use client";

import { useState, useEffect } from "react";
import { getPublicProfile } from "@/lib/api/users";
import type { UserPublicProfile } from "@/types/user";

export function usePublicProfile(username: string) {
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicProfile(username);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込み失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [username]);

  return { profile, loading, error };
}
