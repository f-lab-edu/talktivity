import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import golden from "./golden/auth-token-es256.json";

const storageKey = "sb-example-auth-token";
let store: Map<string, string>;
let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
  store = new Map();
  assign = vi.fn();
  vi.stubGlobal("window", {
    location: { origin: "https://app.example", href: "https://app.example/", assign },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("document", { visibilityState: "hidden" });
  vi.stubGlobal("navigator", { userAgent: "unit-test" });
  vi.stubGlobal("BroadcastChannel", undefined);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function storedSession() {
  store.set(
    storageKey,
    JSON.stringify({
      access_token: golden.token,
      refresh_token: "test-refresh-token",
      token_type: "bearer",
      expires_at: 4102444800,
      expires_in: 3600,
      user: {
        id: golden.expected.id,
        app_metadata: { provider: "google" },
        user_metadata: { name: golden.expected.nickname },
        aud: "authenticated",
        created_at: "2026-11-20T00:00:00Z",
      },
    }),
  );
}

describe("브라우저 인증 REST 경계", () => {
  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"])(
    "%s 없이 클라이언트를 만들거나 네트워크를 사용하지 않는다",
    async (name) => {
      vi.stubEnv(name, "");
      const network = vi.fn();
      vi.stubGlobal("fetch", network);
      const auth = await import("../lib/auth-client");
      expect(auth.authEnabled).toBe(false);
      await expect(auth.signIn("kakao")).rejects.toThrow();
      await expect(auth.authFetch("/api/me")).rejects.toThrow();
      expect(network).not.toHaveBeenCalled();
      expect(store.size).toBe(0);
    },
  );

  it.each([
    ["kakao", "profile_nickname"],
    ["google", "openid profile"],
  ] as const)("%s는 이메일 scope 없이 PKCE로 루트에 복귀한다", async (provider, scope) => {
    const { signIn } = await import("../lib/auth-client");
    await signIn(provider);
    const redirect = new URL(assign.mock.calls[0]?.[0]);
    expect(redirect.origin).toBe("https://example.supabase.co");
    expect(redirect.pathname).toBe("/auth/v1/authorize");
    expect(redirect.searchParams.get("provider")).toBe(provider);
    expect(redirect.searchParams.get("redirect_to")).toBe("https://app.example/");
    expect(redirect.searchParams.get("scope")).toBe(scope);
    expect(redirect.searchParams.has("scopes")).toBe(false);
    expect(redirect.searchParams.get("code_challenge_method")).toBe("s256");
    expect(redirect.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("세션의 Bearer로 REST를 호출하고 기존 헤더와 메서드를 보존한다", async () => {
    storedSession();
    const requests: Request[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push(new Request(input, init));
        return Response.json({ ok: true });
      }),
    );
    const { authFetch } = await import("../lib/auth-client");
    const response = await authFetch("/private", {
      method: "POST",
      headers: { "X-Test": "kept", Authorization: "wrong" },
      body: "body",
    });
    expect(await response.json()).toEqual({ ok: true });
    const request = requests.find((item) => item.url === "https://api.example/private");
    expect(request?.headers.get("Authorization")).toBe(`Bearer ${golden.token}`);
    expect(request?.headers.get("X-Test")).toBe("kept");
    expect(request?.method).toBe("POST");
    expect(await request?.text()).toBe("body");
    expect(request?.cache).toBe("no-store");
  });

  it("세션 없이 인증 API를 호출하지 않는다", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const { authFetch } = await import("../lib/auth-client");
    await expect(authFetch("/private")).rejects.toThrow("로그인이 필요해요.");
    expect(network).not.toHaveBeenCalled();
  });

  it("SIGNED_IN에서 프로필을 한 번 동기화하고 실패해도 다른 요청을 유지한다", async () => {
    storedSession();
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        requests.push(request.url);
        if (request.url.endsWith("/api/me")) throw new TypeError("offline");
        return Response.json({ ok: true });
      }),
    );
    const { authFetch } = await import("../lib/auth-client");
    const first = await authFetch("/first");
    const second = await authFetch("/second");
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(requests.filter((url) => url.endsWith("/api/me"))).toEqual([
      "https://api.example/api/me",
    ]);
  });

  it("로그아웃하면 저장된 세션으로 더 이상 API를 호출할 수 없다", async () => {
    storedSession();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    const { signOut, authFetch } = await import("../lib/auth-client");
    await signOut();
    expect(store.has(storageKey)).toBe(false);
    await expect(authFetch("/private")).rejects.toThrow("로그인이 필요해요.");
  });
});
