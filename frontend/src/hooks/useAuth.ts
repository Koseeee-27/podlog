"use client";

import { useEffect, useState, useCallback } from "react";
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
  const supabase = createClient();

  const refreshProfile = useCallback(async () => {
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
  }, [supabase.auth]);

  useEffect(() => {
    refreshProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!session) {
        setState({ status: "unauthenticated" });
      } else {
        refreshProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ status: "unauthenticated" });
  }, [supabase.auth]);

  return { ...state, signOut, refreshProfile };
}
