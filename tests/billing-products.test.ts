import { describe, expect, it, vi } from "vitest";
import {
  authenticatedRequest,
  billingHarness,
  priceId,
  transactionId,
  userId,
} from "./helpers/billing";

vi.mock("server-only", () => ({}));
const wire = billingHarness();
const secondPrice = "pri_00000000000000000000000001";

function price(amount: string, currency = "KRW") {
  return Response.json({ data: { unit_price: { amount, currency_code: currency } } });
}
function servePrices() {
  wire.respond = (request) => (request.url.includes("/prices/") ? price("4900") : Response.json(2));
}

describe("구매 가능 상품", () => {
  it("공개 목록은 구매 제한과 무관하며 비활성 상품과 가격 조회 실패를 제외한다", async () => {
    vi.stubEnv("BILLING_TEST_USER_IDS", "");
    wire.products = [
      { price_id: priceId, name: "정상", credits: 1, active: true },
      { price_id: secondPrice, name: "조회 실패", credits: 5, active: true },
      { price_id: "pri_00000000000000000000000002", name: "중지", credits: 10, active: false },
    ];
    wire.respond = (request) =>
      request.url.endsWith(`/prices/${priceId}`)
        ? price("4900")
        : new Response(null, { status: 503 });
    const { pricedCatalog, purchaseProducts } = await import("../lib/server/paddle");

    expect(await purchaseProducts(userId)).toEqual([]);
    expect(wire.requests).toHaveLength(0);
    expect(await pricedCatalog()).toEqual([
      { priceId, name: "정상", credits: 1, amount: 4900, currency: "KRW" },
    ]);
    expect(wire.requests.filter((request) => request.url.includes("/prices/"))).toHaveLength(2);
  });
  it("활성 상품만 정렬된 DB 순서로 가격과 잔액을 반환한다", async () => {
    wire.products = [
      { price_id: secondPrice, name: "작은 팩", credits: 1, active: true },
      { price_id: priceId, name: "큰 팩", credits: 5, active: true },
      { price_id: "pri_00000000000000000000000002", name: "중지", credits: 10, active: false },
    ];
    wire.respond = (request) =>
      request.url.endsWith(`/prices/${secondPrice}`)
        ? price("199", "USD")
        : request.url.includes("/prices/")
          ? price("4900")
          : Response.json(-1);
    const { GET } = await import("../app/api/credits/route");
    const response = await GET(authenticatedRequest("/api/credits"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      balance: -1,
      products: [
        { priceId: secondPrice, name: "작은 팩", credits: 1, amount: 199, currency: "USD" },
        { priceId, name: "큰 팩", credits: 5, amount: 4900, currency: "KRW" },
      ],
    });
    const catalogRequest = wire.requests.find((request) => request.url.includes("/products?"));
    expect(catalogRequest && new URL(catalogRequest.url).searchParams.get("order")).toBe(
      "sort.asc,price_id.asc",
    );
    expect(wire.requests.filter((request) => request.url.includes("/prices/"))).toHaveLength(2);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("가격은 상품별로 10분간 캐시하고 만료 시 다시 조회한다", async () => {
    servePrices();
    const { pricedCatalog } = await import("../lib/server/paddle");
    await pricedCatalog();
    const { GET } = await import("../app/api/credits/route");
    await GET(authenticatedRequest("/api/credits"));
    vi.advanceTimersByTime(599_999);
    await GET(authenticatedRequest("/api/credits"));
    expect(wire.requests.filter((request) => request.url.includes("/prices/"))).toHaveLength(1);
    vi.advanceTimersByTime(1);
    wire.respond = (request) =>
      request.url.includes("/prices/") ? price("5900") : Response.json(2);
    const response = await GET(authenticatedRequest("/api/credits"));
    expect(await response.json()).toMatchObject({ products: [{ amount: 5900 }] });
    expect(wire.requests.filter((request) => request.url.includes("/prices/"))).toHaveLength(2);
  });
  it.each(["PADDLE_ENV", "PADDLE_API_KEY", "PADDLE_WEBHOOK_SECRET"])(
    "%s 누락 시 잔액만 반환한다",
    async (name) => {
      vi.stubEnv(name, "");
      servePrices();
      const { pricedCatalog } = await import("../lib/server/paddle");
      expect(await pricedCatalog()).toEqual([]);
      expect(wire.requests).toHaveLength(0);
      const { GET } = await import("../app/api/credits/route");
      const response = await GET(authenticatedRequest("/api/credits"));
      expect(await response.json()).toEqual({ balance: 2, products: [] });
      expect(wire.requests).toHaveLength(1);
    },
  );
  it.each(["http", "network", "invalid"])("가격 조회 %s 실패 상품만 제외한다", async (failure) => {
    wire.products.push({ price_id: secondPrice, name: "정상", credits: 2, active: true });
    wire.respond = (request) => {
      if (request.url.endsWith(`/prices/${priceId}`)) {
        switch (failure) {
          case "http":
            return new Response("private vendor response", { status: 503 });
          case "network":
            throw new TypeError("private API key");
          case "invalid":
            return price("1.5");
          default:
            throw new Error("Unexpected failure fixture");
        }
      }
      return request.url.includes("/prices/") ? price("2900") : Response.json(2);
    };
    const { GET } = await import("../app/api/credits/route");
    const response = await GET(authenticatedRequest("/api/credits"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      balance: 2,
      products: [{ priceId: secondPrice, name: "정상", credits: 2, amount: 2900, currency: "KRW" }],
    });
    expect(console.warn).toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("private");
  });
  it("실패한 가격은 캐시하지 않아 다음 요청에서 복구된다", async () => {
    wire.respond = (request) =>
      request.url.includes("/prices/") ? new Response(null, { status: 500 }) : Response.json(2);
    const { GET } = await import("../app/api/credits/route");
    expect(await (await GET(authenticatedRequest("/api/credits"))).json()).toEqual({
      balance: 2,
      products: [],
    });
    servePrices();
    expect(await (await GET(authenticatedRequest("/api/credits"))).json()).toMatchObject({
      products: [{ priceId, amount: 4900 }],
    });
  });
});

describe("샌드박스 구매 제한", () => {
  it.each(["", "invalid", "11111111-1111-4111-8111-111111111111"])(
    "테스터가 아닌 계정은 상품을 볼 수 없고 결제할 수 없다: %s",
    async (ids) => {
      vi.stubEnv("BILLING_TEST_USER_IDS", ids);
      servePrices();
      const { GET } = await import("../app/api/credits/route");
      expect(await (await GET(authenticatedRequest("/api/credits"))).json()).toEqual({
        balance: 2,
        products: [],
      });
      const { POST } = await import("../app/api/billing/checkout/route");
      const response = await POST(authenticatedRequest("/api/billing/checkout", { priceId }));
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: "BILLING_UNAVAILABLE" } });
      expect(wire.requests).toHaveLength(1);
    },
  );
  it.each(["sandbox", "production"])(
    "허용 계정은 %s에서 상품 조회와 결제가 가능하다",
    async (env) => {
      vi.stubEnv("PADDLE_ENV", env);
      vi.stubEnv("BILLING_TEST_USER_IDS", env === "sandbox" ? ` invalid, ${userId} , ` : "");
      wire.respond = (request) =>
        request.url.endsWith("/transactions")
          ? Response.json({ data: { id: transactionId } })
          : request.url.includes("/prices/")
            ? price("4900")
            : Response.json(2);
      const { GET } = await import("../app/api/credits/route");
      expect(await (await GET(authenticatedRequest("/api/credits"))).json()).toMatchObject({
        products: [{ priceId }],
      });
      const { POST } = await import("../app/api/billing/checkout/route");
      expect((await POST(authenticatedRequest("/api/billing/checkout", { priceId }))).status).toBe(
        200,
      );
    },
  );
});
