import "server-only";
import { createRemoteJWKSet } from "jose";
import { type AuthUser, verifyAccessToken } from "@/lib/core/auth";
import { apiError } from "@/lib/server/http";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export async function authenticate(request: Request): Promise<AuthUser | Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !process.env.SUPABASE_SECRET_KEY)
    return apiError("AUTH_DISABLED", "로그인 서비스를 준비 중이에요.", 503, {
      "Cache-Control": "no-store",
    });
  const bearer = /^Bearer ([^\s]+)$/i.exec(request.headers.get("Authorization") ?? "");
  if (!bearer?.[1])
    return apiError("UNAUTHORIZED", "로그인이 필요해요.", 401, {
      "Cache-Control": "no-store",
    });
  try {
    jwks ??= createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
    return await verifyAccessToken(bearer[1], jwks, {
      issuer: `${url}/auth/v1`,
      audience: "authenticated",
    });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return apiError("UNAUTHORIZED", "로그인을 다시 해 주세요.", 401, {
      "Cache-Control": "no-store",
    });
  }
}
