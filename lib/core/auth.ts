import { type JWTVerifyGetKey, jwtVerify } from "jose";
import { z } from "zod";

export const authUserSchema = z.object({
  id: z.uuid(),
  provider: z.enum(["kakao", "google"]),
  nickname: z.string().max(80).nullable(),
});
export type AuthUser = Readonly<z.infer<typeof authUserSchema>>;
export const meResponseSchema = z.object({ user: authUserSchema });

export function nicknameFromMetadata(metadata: Readonly<Record<string, unknown>>): string | null {
  // First nonempty string wins in this order; trim and cap to 80 UTF-16 code units.
  const nickname = ["name", "full_name", "nickname", "preferred_username", "user_name"]
    .map((key) => metadata[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return nickname?.trim().slice(0, 80) ?? null;
}

const claimsSchema = z.object({
  sub: z.uuid(),
  exp: z.number(),
  app_metadata: z.object({ provider: authUserSchema.shape.provider }),
  user_metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function verifyAccessToken(
  token: string,
  getKey: JWTVerifyGetKey,
  options: { readonly issuer: string; readonly audience: string },
): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, getKey, {
    ...options,
    algorithms: ["ES256"],
    requiredClaims: ["exp", "sub"],
  });
  const claims = claimsSchema.parse(payload);
  return {
    id: claims.sub,
    provider: claims.app_metadata.provider,
    nickname: nicknameFromMetadata(claims.user_metadata ?? {}),
  };
}
