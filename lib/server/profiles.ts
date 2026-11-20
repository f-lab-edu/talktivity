import "server-only";
import type { AuthUser } from "@/lib/core/auth";
import { supabaseAdmin } from "@/lib/server/supabase";

export async function upsertProfile(user: AuthUser): Promise<void> {
  const { error } = await supabaseAdmin().from("profiles").upsert({
    id: user.id,
    provider: user.provider,
    nickname: user.nickname,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("프로필 저장을 완료하지 못했어요.");
}
