import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { meResponseSchema } from "../lib/core/auth";
import golden from "./golden/auth-token-es256.json";

vi.mock("server-only", () => ({}));

const url = "https://example.supabase.co";
const secret = "sb_secret_test";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_SECRET_KEY", secret);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-20T00:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GET /api/me", () => {
  it.each([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
  ])("%s가 없으면 외부 요청 없이 503을 반환한다", async (name) => {
    vi.stubEnv(name, "");
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const { GET } = await import("../app/api/me/route");
    const response = await GET(new Request("https://app.example/api/me"));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "AUTH_DISABLED" } });
    expect(network).not.toHaveBeenCalled();
  });

  it.each([undefined, "Basic abc", "Bearer invalid", "Bearer a b"])(
    "누락되거나 잘못된 인증 %s는 프로필을 저장하지 않는다",
    async (authorization) => {
      const network = vi.fn();
      vi.stubGlobal("fetch", network);
      const { GET } = await import("../app/api/me/route");
      const response = await GET(
        new Request("https://app.example/api/me", {
          headers: authorization ? { Authorization: authorization } : {},
        }),
      );
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(network).not.toHaveBeenCalled();
    },
  );

  it("JWKS로 인증한 프로필만 서버 키로 저장하고 계약에 맞게 응답한다", async () => {
    const writes: { body: unknown; authorization: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        if (request.url === `${url}/auth/v1/.well-known/jwks.json`)
          return Response.json({ keys: [golden.publicJwk] });
        if (request.url === `${url}/rest/v1/profiles`) {
          writes.push({
            body: await request.json(),
            authorization: request.headers.get("Authorization"),
          });
          return new Response(null, { status: 201 });
        }
        throw new Error(`Unexpected URL ${request.url}`);
      }),
    );
    const { GET } = await import("../app/api/me/route");
    const response = await GET(
      new Request("https://app.example/api/me", {
        headers: { Authorization: `Bearer ${golden.token}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(meResponseSchema.parse(await response.json())).toEqual({ user: golden.expected });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(writes).toEqual([
      {
        body: { ...golden.expected, updated_at: "2026-11-20T00:00:00.000Z" },
        authorization: `Bearer ${secret}`,
      },
    ]);
  });

  it("DB 오류를 개인정보 없는 500 응답으로 변환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        if (request.url.endsWith("/jwks.json")) return Response.json({ keys: [golden.publicJwk] });
        return Response.json({ message: "private database error", code: "42501" }, { status: 403 });
      }),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("../app/api/me/route");
    const response = await GET(
      new Request("https://app.example/api/me", {
        headers: { Authorization: `Bearer ${golden.token}` },
      }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: "PROFILE_FAILED" } });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private database error");
  });
});
