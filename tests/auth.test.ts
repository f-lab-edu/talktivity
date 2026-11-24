import { createLocalJWKSet, exportJWK, generateKeyPair, type JWTPayload, SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { meResponseSchema, verifyAccessToken } from "../lib/core/auth";
import golden from "./golden/auth-token-es256.json";

const issuer = "https://example.supabase.co/auth/v1";
const options = { issuer, audience: "authenticated" };
const id = "123e4567-e89b-42d3-a456-426614174000";
const keys = await generateKeyPair("ES256");
const jwk = await exportJWK(keys.publicKey);
const getKey = createLocalJWKSet({ keys: [{ ...jwk, kid: "test", alg: "ES256" }] });
const claims = {
  sub: id,
  app_metadata: { provider: "kakao" },
  user_metadata: { name: "  톡친구  " },
};

async function sign(overrides: JWTPayload = {}) {
  return new SignJWT({
    ...claims,
    exp: 4102444800,
    iss: issuer,
    aud: "authenticated",
    ...overrides,
  })
    .setProtectedHeader({ alg: "ES256", kid: "test" })
    .sign(keys.privateKey);
}

describe("ES256 액세스 토큰", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T00:00:00Z"));
  });
  afterAll(() => vi.useRealTimers());

  it("유효한 토큰에서 필요한 프로필만 반환한다", async () => {
    expect(await verifyAccessToken(await sign(), getKey, options)).toEqual({
      id,
      provider: "kakao",
      nickname: "톡친구",
    });
  });

  it.each([
    ["만료", { exp: 1 }],
    ["issuer 불일치", { iss: "https://attacker.example" }],
    ["audience 불일치", { aud: "other" }],
    ["미지원 공급자", { app_metadata: { provider: "github" } }],
    ["잘못된 사용자 ID", { sub: "not-a-uuid" }],
  ])("%s 토큰을 거부한다", async (_label, overrides) => {
    await expect(verifyAccessToken(await sign(overrides), getKey, options)).rejects.toThrow();
  });

  it("만료 시각이 없는 토큰을 거부한다", async () => {
    const token = await new SignJWT({ ...claims, iss: issuer, aud: "authenticated" })
      .setProtectedHeader({ alg: "ES256", kid: "test" })
      .sign(keys.privateKey);
    await expect(verifyAccessToken(token, getKey, options)).rejects.toThrow();
  });

  it("변조된 서명을 거부한다", async () => {
    const token = await sign();
    const [header, payload, signature] = token.split(".");
    const tampered = `${header}.${payload}.${signature?.startsWith("A") ? "B" : "A"}${signature?.slice(1)}`;
    await expect(verifyAccessToken(tampered, getKey, options)).rejects.toThrow();
  });

  it("HS256 토큰을 거부한다", async () => {
    const token = await new SignJWT({
      ...claims,
      exp: 4102444800,
      iss: issuer,
      aud: "authenticated",
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new Uint8Array(32));
    await expect(verifyAccessToken(token, getKey, options)).rejects.toThrow();
  });

  it("닉네임이 없으면 null을 반환한다", async () => {
    const user = await verifyAccessToken(await sign({ user_metadata: {} }), getKey, options);
    expect(user.nickname).toBeNull();
  });

  it.each(["name", "full_name", "nickname", "preferred_username", "user_name"])(
    "%s 닉네임을 정리하고 길이를 제한한다",
    async (field) => {
      const user = await verifyAccessToken(
        await sign({ user_metadata: { [field]: `  ${"가".repeat(90)}  ` } }),
        getKey,
        options,
      );
      expect(user.nickname).toBe("가".repeat(80));
    },
  );

  it("빈 값과 비문자열은 건너뛰고 앞선 닉네임을 우선한다", async () => {
    const user = await verifyAccessToken(
      await sign({ user_metadata: { name: " ", full_name: 7, nickname: "별명", user_name: "뒤" } }),
      getKey,
      options,
    );
    expect(user.nickname).toBe("별명");
  });

  it("언어 중립 골든 벡터를 검증하고 내 정보 계약을 통과한다", async () => {
    const user = await verifyAccessToken(
      golden.token,
      createLocalJWKSet({ keys: [golden.publicJwk] }),
      { issuer: golden.issuer, audience: golden.audience },
    );
    expect(user).toEqual(golden.expected);
    expect(meResponseSchema.parse({ user })).toEqual({ user: golden.expected });
  });
});
