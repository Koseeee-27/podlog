"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchMyProfile } from "@/lib/api/users";
import type { User as AppUser } from "@/types/user";
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { ApiRequestError } from "@/types/api";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "no_profile"; authUser: SupabaseUser }
  | { status: "authenticated"; authUser: SupabaseUser; profile: AppUser };

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const getOrCreateClient = useCallback(() => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }, []);

  const refreshProfile = useCallback(async () => {
    const supabase = getOrCreateClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState({ status: "unauthenticated" });
      return;
    }

    // プロフィール取得を最大2回試行（コールドスタート対策）
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const profile = await fetchMyProfile();
        setState({ status: "authenticated", authUser: user, profile });
        return;
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 404) {
          setState({ status: "no_profile", authUser: user });
          return;
        }
        // サーバーエラー（500等）: 1回目ならリトライ、2回目なら諦める
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        // リトライ後も失敗 → unauthenticated ではなく no_profile として扱う
        // （認証自体は成功しているため、ログアウト扱いにしない）
        setState({ status: "no_profile", authUser: user });
      }
    }
  }, [getOrCreateClient]);

  useEffect(() => {
    const supabase = getOrCreateClient();

    // 初回プロフィール取得を非同期で実行（同期的な setState によるカスケードレンダーを回避）
    queueMicrotask(() => { refreshProfile(); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!session) {
        setState({ status: "unauthenticated" });
      } else {
        refreshProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshProfile, getOrCreateClient]);

  const signOut = useCallback(async () => {
    const supabase = getOrCreateClient();
    await supabase.auth.signOut();
    setState({ status: "unauthenticated" });
  }, [getOrCreateClient]);

  return { ...state, signOut, refreshProfile };
}
