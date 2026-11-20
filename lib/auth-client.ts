"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { type AuthUser, authUserSchema } from "@/lib/core/auth";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const authEnabled = Boolean(url && key);
let client: SupabaseClient | undefined;
let syncedUser: string | null = null;

function browserClient() {
  if (typeof window === "undefined" || !url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true },
    });
    client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") syncedUser = null;
      if (event !== "SIGNED_IN" || !session || syncedUser === session.user.id) return;
      syncedUser = session.user.id;
      const provider = authUserSchema.shape.provider.safeParse(session.user.app_metadata.provider);
      if (provider.success) track("login_success", { provider: provider.data });
      // Never await another auth call inside the SDK's auth-state lock.
      queueMicrotask(() => {
        void authFetch("/api/me").catch((error: unknown) => {
          if (!(error instanceof Error)) throw error;
          // Profile sync is optional; an offline API must not interrupt the result screen.
        });
      });
    });
  }
  return client;
}

export async function signIn(provider: AuthUser["provider"]): Promise<void> {
  const supabase = browserClient();
  if (!supabase) throw new Error("로그인 서비스를 준비 중이에요.");
  track("login_start", { provider });
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/`,
      // `scopes` appends to provider defaults. Singular `scope` replaces them.
      queryParams: { scope: provider === "kakao" ? "profile_nickname" : "openid profile" },
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = browserClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  track("logout");
}

export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const supabase = browserClient();
  if (!supabase) throw new Error("로그인 서비스를 준비 중이에요.");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("로그인이 필요해요.");
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!authEnabled);
  useEffect(() => {
    const supabase = browserClient();
    if (!supabase) return;
    let active = true;
    let receivedEvent = false;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      receivedEvent = true;
      if (!active) return;
      setSession(next);
      setReady(true);
    });
    void supabase.auth.getSession().then(
      ({ data }) => {
        if (!active || receivedEvent) return;
        setSession(data.session);
        setReady(true);
      },
      (error: unknown) => {
        if (!(error instanceof Error)) throw error;
        if (active) setReady(true);
      },
    );
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return { session, ready };
}
