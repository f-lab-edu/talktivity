import { createHmac } from "node:crypto";
import { afterEach, beforeEach, vi } from "vitest";
import { mockPaidReport } from "../../lib/core/billing/report";
import golden from "../golden/auth-token-es256.json";

export const supabaseUrl = "https://example.supabase.co";
export const secret = "sb_secret_test";
export const priceId = "pri_01gsz8z1q1n00f12qt82y31smh";
export const transactionId = "txn_01h04vsbhqc62t8hmd4z3b578c";
export const adjustmentId = "adj_01ghvjt9dbpnndeqjve8cktgqs";
export const reportId = "11111111-1111-4111-8111-111111111111";
export const userId = golden.expected.id;
export const analysisInput = {
  conversation: "민수: 지수야 010-1234-5678로 연락해\n지수: 민수야 알겠어",
  relationship: "연인",
  mySpeaker: "민수",
} as const;
export const reportRow = {
  id: reportId,
  user_id: userId,
  content: mockPaidReport(analysisInput),
  created_at: "2026-11-20T00:00:00.000Z",
};

export function billingHarness() {
  // The wire handler and captured requests are deliberately mutable test fixtures.
  const wire: {
    respond: (request: Request) => Response | Promise<Response>;
    readonly requests: Request[];
    products: { price_id: string; name: string; credits: number; active: boolean }[];
  } = {
    respond: (request) => {
      throw new Error(`Unexpected URL ${request.url}`);
    },
    requests: [],
    products: [],
  };
  beforeEach(() => {
    vi.resetModules();
    wire.requests.length = 0;
    wire.products = [{ price_id: priceId, name: "크레딧 팩", credits: 5, active: true }];
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T00:00:00Z"));
    for (const [key, value] of Object.entries({
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      SUPABASE_SECRET_KEY: secret,
      PADDLE_ENV: "sandbox",
      PADDLE_API_KEY: "paddle-test-key",
      PADDLE_WEBHOOK_SECRET: "webhook-test-secret",
      BILLING_TEST_USER_IDS: userId,
      NEXT_PUBLIC_POSTHOG_KEY: "",
      NEXT_PUBLIC_POSTHOG_HOST: "",
      LLM_PROVIDER: "mock",
      REPORT_SYSTEM_PROMPT: "fake system",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
    }))
      vi.stubEnv(key, value);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        if (request.url === `${supabaseUrl}/auth/v1/.well-known/jwks.json`)
          return Response.json({ keys: [golden.publicJwk] });
        wire.requests.push(request.clone());
        if (new URL(request.url).pathname === "/rest/v1/products")
          return Response.json(wire.products);
        return wire.respond(request);
      }),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  return wire;
}

export function authenticatedRequest(path: string, body?: unknown): Request {
  return new Request(`https://app.example${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${golden.token}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
export function webhookRequest(event: unknown): Request {
  const rawBody = typeof event === "string" ? event : JSON.stringify(event);
  const ts = Math.floor(Date.now() / 1000);
  return new Request("https://app.example/api/billing/webhook", {
    method: "POST",
    body: rawBody,
    headers: {
      "Paddle-Signature": `ts=${ts};h1=${createHmac("sha256", "webhook-test-secret").update(`${ts}:${rawBody}`).digest("hex")}`,
    },
  });
}
export function databaseError(message: string, code = "P0001") {
  return Response.json({ message, code, details: null, hint: null }, { status: 400 });
}
