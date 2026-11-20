import { describe, expect, it, vi } from "vitest";
import {
  adjustmentId,
  billingHarness,
  priceId,
  transactionId,
  userId,
  webhookRequest,
} from "./helpers/billing";

vi.mock("server-only", () => ({}));
const wire = billingHarness();
const completed = {
  event_type: "transaction.completed",
  data: {
    id: transactionId,
    status: "completed",
    currency_code: "KRW",
    custom_data: { userId, posthogId: "anonymous-id" },
    details: { totals: { total: "9800" } },
    items: [{ price: { id: priceId }, quantity: 2 }],
  },
};
const refund = {
  event_type: "adjustment.updated",
  data: {
    id: adjustmentId,
    transaction_id: transactionId,
    action: "refund",
    status: "approved",
    custom_data: { posthogId: "anonymous-id" },
  },
};
function analyticsEnv() {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_private-test-key");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://analytics.example/");
}
function captureRequests() {
  return wire.requests.filter((request) => request.url.includes("analytics.example"));
}

describe("결제 서버 분석 이벤트", () => {
  it.each([true, false])("새 구매에만 payment_success를 전송한다: %s", async (applied) => {
    analyticsEnv();
    wire.respond = (request) =>
      request.url.includes("analytics.example")
        ? Response.json({ status: 1 })
        : Response.json(applied);
    const { POST } = await import("../app/api/billing/webhook/route");
    expect((await POST(webhookRequest(completed))).status).toBe(200);
    const requests = captureRequests();
    expect(requests).toHaveLength(applied ? 1 : 0);
    if (applied) {
      expect(requests[0]?.url).toBe("https://analytics.example/i/v0/e/");
      expect(await requests[0]?.json()).toEqual({
        api_key: "phc_private-test-key",
        event: "payment_success",
        distinct_id: "anonymous-id",
        properties: { credits: 10, amount: 9800, currency: "KRW" },
      });
    }
  });
  it.each([true, false])("새 환불에만 원장의 지급 크레딧을 전송한다: %s", async (applied) => {
    analyticsEnv();
    wire.respond = (request) => {
      if (request.url.includes("/credit_ledger"))
        return Response.json([{ user_id: userId, delta: 7 }]);
      return request.url.includes("analytics.example")
        ? Response.json({ status: 1 })
        : Response.json(applied);
    };
    const { POST } = await import("../app/api/billing/webhook/route");
    expect((await POST(webhookRequest(refund))).status).toBe(200);
    expect(captureRequests()).toHaveLength(applied ? 1 : 0);
    if (applied)
      expect(await captureRequests()[0]?.json()).toEqual({
        api_key: "phc_private-test-key",
        event: "refund_processed",
        distinct_id: "anonymous-id",
        properties: { credits: 7 },
      });
  });
  it.each(["payment", "refund"])("분석 ID가 없는 %s는 지급·회수만 한다", async (kind) => {
    analyticsEnv();
    wire.respond = (request) =>
      request.url.includes("/credit_ledger")
        ? Response.json([{ user_id: userId, delta: 10 }])
        : Response.json(true);
    const event =
      kind === "payment"
        ? { ...completed, data: { ...completed.data, custom_data: { userId } } }
        : { ...refund, data: { ...refund.data, custom_data: null } };
    const { POST } = await import("../app/api/billing/webhook/route");
    expect((await POST(webhookRequest(event))).status).toBe(200);
    expect(captureRequests()).toHaveLength(0);
    expect(wire.requests.some((request) => request.url.includes("/rpc/"))).toBe(true);
  });
  it.each(["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"])(
    "%s 누락은 웹훅 처리에 영향이 없다",
    async (name) => {
      analyticsEnv();
      vi.stubEnv(name, "");
      wire.respond = () => Response.json(true);
      const { POST } = await import("../app/api/billing/webhook/route");
      expect((await POST(webhookRequest(completed))).status).toBe(200);
      expect(captureRequests()).toHaveLength(0);
    },
  );
  it.each(["http", "network", "timeout"])("분석 전송 %s 실패도 웹훅은 200이다", async (failure) => {
    analyticsEnv();
    wire.respond = (request) => {
      if (!request.url.includes("analytics.example")) return Response.json(true);
      switch (failure) {
        case "http":
          return new Response("phc_private-test-key", { status: 503 });
        case "network":
          throw new TypeError("phc_private-test-key");
        case "timeout":
          return new Promise<Response>((_, reject) => {
            request.signal.addEventListener("abort", () => reject(request.signal.reason), {
              once: true,
            });
          });
        default:
          throw new Error("Unexpected failure fixture");
      }
    };
    const { POST } = await import("../app/api/billing/webhook/route");
    const response = await POST(webhookRequest(completed));
    expect(response.status).toBe(200);
    expect(console.warn).toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(
      "phc_private-test-key",
    );
  });
  it("분석 금액이 잘못되어도 유효한 구매 크레딧은 지급한다", async () => {
    analyticsEnv();
    wire.respond = () => Response.json(true);
    const { POST } = await import("../app/api/billing/webhook/route");
    const response = await POST(
      webhookRequest({
        ...completed,
        data: { ...completed.data, details: { totals: { total: "bad" } } },
      }),
    );
    expect(response.status).toBe(200);
    expect(wire.requests.some((request) => request.url.includes("/grant_credits"))).toBe(true);
    expect(captureRequests()).toHaveLength(0);
  });
});
