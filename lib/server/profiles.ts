import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthUser } from "@/lib/core/auth";

type ProfileWrite = AuthUser & { readonly updated_at: string };
type Database = {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      profiles: {
        Row: ProfileWrite & { readonly created_at: string };
        Insert: ProfileWrite;
        Update: Partial<ProfileWrite>;
        Relationships: [];
      };
    };
  };
};
let client: SupabaseClient<Database> | undefined;

export async function upsertProfile(user: AuthUser): Promise<void> {
  // authenticate has already checked these server configuration values.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("프로필 저장 환경 변수가 없어요.");
  client ??= createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.from("profiles").upsert({
    id: user.id,
    provider: user.provider,
    nickname: user.nickname,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("프로필 저장을 완료하지 못했어요.");
}
