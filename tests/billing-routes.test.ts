import { describe, expect, it, vi } from "vitest";
import { checkoutResponseSchema, creditsResponseSchema } from "../lib/core/billing/contracts";
import { couponRedeemResponseSchema } from "../lib/core/billing/coupon";
import {
  authenticatedRequest,
  billingHarness,
  databaseError,
  priceId,
  secret,
  transactionId,
  userId,
} from "./helpers/billing";

vi.mock("server-only", () => ({}));
const wire = billingHarness();

describe("인증과 크레딧", () => {
  it.each([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
  ])("%s 누락은 외부 요청 없이 503이다", async (name) => {
    vi.stubEnv(name, "");
    const { GET } = await import("../app/api/credits/route");
    const response = await GET(authenticatedRequest("/api/credits"));
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(wire.requests).toHaveLength(0);
  });
  it("인증하지 않은 사용자에게 잔액을 공개하지 않는다", async () => {
    const { GET } = await import("../app/api/credits/route");
    expect((await GET(new Request("https://app.example/api/credits"))).status).toBe(401);
    expect(wire.requests).toHaveLength(0);
  });
  it("서버 키로 검증된 사용자의 음수 잔액도 반환한다", async () => {
    wire.respond = async (request) => {
      expect(request.url).toContain("/rpc/credit_balance");
      expect(request.headers.get("Authorization")).toBe(`Bearer ${secret}`);
      expect(await request.json()).toEqual({ p_user: userId });
      return Response.json(-2);
    };
    const { GET } = await import("../app/api/credits/route");
    const response = await GET(authenticatedRequest("/api/credits"));
    expect(creditsResponseSchema.parse(await response.json())).toEqual({ balance: -2 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("DB 내부 오류를 공개하지 않는다", async () => {
    wire.respond = () => databaseError("private secret", "42501");
    const { GET } = await import("../app/api/credits/route");
    const response = await GET(authenticatedRequest("/api/credits"));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("private secret");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private secret");
  });
});

describe("결제 생성", () => {
  it.each(["sandbox", "production"])(
    "%s API에 서버가 사용자와 상품을 지정한다",
    async (environment) => {
      vi.stubEnv("PADDLE_ENV", environment);
      wire.respond = async (request) => {
        expect(request.url).toBe(
          `https://${environment === "sandbox" ? "sandbox-api" : "api"}.paddle.com/transactions`,
        );
        expect(request.headers.get("Authorization")).toBe("Bearer paddle-test-key");
        expect(await request.json()).toEqual({
          collection_mode: "automatic",
          items: [{ price_id: priceId, quantity: 1 }],
          custom_data: { userId, posthogId: "anonymous-analytics-id" },
        });
        return Response.json({ data: { id: transactionId } }, { status: 201 });
      };
      const { POST } = await import("../app/api/billing/checkout/route");
      const response = await POST(
        authenticatedRequest("/api/billing/checkout", { posthogId: "anonymous-analytics-id" }),
      );
      expect(response.status).toBe(200);
      expect(checkoutResponseSchema.parse(await response.json())).toEqual({ transactionId });
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    },
  );
  it.each(["PADDLE_ENV", "PADDLE_API_KEY", "PADDLE_WEBHOOK_SECRET", "PADDLE_PRICE_ID"])(
    "%s 없으면 503이다",
    async (name) => {
      vi.stubEnv(name, "");
      const { POST } = await import("../app/api/billing/checkout/route");
      const response = await POST(authenticatedRequest("/api/billing/checkout", {}));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: { code: "BILLING_DISABLED" } });
      expect(wire.requests).toHaveLength(0);
    },
  );
  it.each([{ userId: "forged" }, { posthogId: "x".repeat(201) }])(
    "사용자 지정 상품·사용자 주입은 거절한다",
    async (body) => {
      const { POST } = await import("../app/api/billing/checkout/route");
      expect((await POST(authenticatedRequest("/api/billing/checkout", body))).status).toBe(400);
      expect(wire.requests).toHaveLength(0);
    },
  );
  it("Paddle 장애는 재시도 없이 502로 반환한다", async () => {
    wire.respond = () => Response.json({ error: "private vendor error" }, { status: 503 });
    const { POST } = await import("../app/api/billing/checkout/route");
    const response = await POST(authenticatedRequest("/api/billing/checkout", {}));
    expect(response.status).toBe(502);
    expect(wire.requests).toHaveLength(1);
  });
});

describe("쿠폰 사용", () => {
  it("Paddle 없이도 정규화한 쿠폰을 로그인 사용자에게 적용한다", async () => {
    vi.stubEnv("PADDLE_API_KEY", "");
    wire.respond = async (request) => {
      if (request.url.endsWith("/redeem_coupon")) {
        expect(await request.json()).toEqual({ p_user: userId, p_code: "WELCOME-20" });
        return Response.json(3);
      }
      return Response.json(4);
    };
    const { POST } = await import("../app/api/coupons/redeem/route");
    const response = await POST(
      authenticatedRequest("/api/coupons/redeem", { code: " wel come-20 " }),
    );
    expect(response.status).toBe(200);
    expect(couponRedeemResponseSchema.parse(await response.json())).toEqual({
      credited: 3,
      balance: 4,
    });
  });
  it.each([
    ["COUPON_NOT_FOUND", 404],
    ["COUPON_EXPIRED", 410],
    ["COUPON_EXHAUSTED", 410],
    ["COUPON_ALREADY_USED", 409],
  ] as const)("%s를 HTTP %s로 변환한다", async (code, status) => {
    wire.respond = () => databaseError(code);
    const { POST } = await import("../app/api/coupons/redeem/route");
    const response = await POST(authenticatedRequest("/api/coupons/redeem", { code: "WELCOME" }));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code } });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([{ code: "!!!" }, { code: 5 }, {}])(
    "잘못된 쿠폰은 DB를 호출하지 않는다",
    async (body) => {
      const { POST } = await import("../app/api/coupons/redeem/route");
      const response = await POST(authenticatedRequest("/api/coupons/redeem", body));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: "COUPON_INVALID" } });
      expect(wire.requests).toHaveLength(0);
    },
  );
  it("IP를 바꾸어도 사용자당 10분 5회 제한을 유지한다", async () => {
    wire.respond = (request) => Response.json(request.url.endsWith("/redeem_coupon") ? 1 : 5);
    const { POST } = await import("../app/api/coupons/redeem/route");
    for (let i = 0; i < 5; i++)
      expect(
        (await POST(authenticatedRequest("/api/coupons/redeem", { code: "WELCOME" }))).status,
      ).toBe(200);
    const request = authenticatedRequest("/api/coupons/redeem", { code: "WELCOME" });
    request.headers.set("x-forwarded-for", "8.8.8.8");
    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("600");
  });
});
