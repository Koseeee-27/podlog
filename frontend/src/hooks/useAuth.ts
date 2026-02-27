"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMyProfile } from "@/lib/api/users";
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

    try {
      const profile = await getMyProfile();
      setState({ status: "authenticated", authUser: user, profile });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setState({ status: "no_profile", authUser: user });
      } else {
        setState({ status: "unauthenticated" });
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
