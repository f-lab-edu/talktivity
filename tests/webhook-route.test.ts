import { describe, expect, it, vi } from "vitest";
import {
  adjustmentId,
  billingHarness,
  databaseError,
  priceId,
  secret,
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
    custom_data: { userId },
    items: [{ price: { id: priceId }, quantity: 2 }],
  },
};
const refund = {
  event_type: "adjustment.updated",
  data: { id: adjustmentId, transaction_id: transactionId, action: "refund", status: "approved" },
};

describe("Paddle webhook 라우트", () => {
  it("서명은 JSON 변환 전 원문으로 검증하고 서버 키로 지급한다", async () => {
    wire.respond = async (request) => {
      expect(request.url).toContain("/rpc/grant_credits");
      expect(request.headers.get("Authorization")).toBe(`Bearer ${secret}`);
      expect(await request.json()).toEqual({
        p_user: userId,
        p_delta: 10,
        p_reason: "purchase",
        p_ref: transactionId,
      });
      return Response.json(true);
    };
    const { POST } = await import("../app/api/billing/webhook/route");
    const response = await POST(webhookRequest(JSON.stringify(completed, null, 2)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("중복 거래도 RPC 결과 false를 성공으로 확인한다", async () => {
    wire.respond = () => Response.json(false);
    const { POST } = await import("../app/api/billing/webhook/route");
    expect((await POST(webhookRequest(completed))).status).toBe(200);
  });
  it("서명 검증 실패는 DB를 호출하지 않는다", async () => {
    const request = webhookRequest(completed);
    request.headers.set("Paddle-Signature", "ts=1;h1=bad");
    const { POST } = await import("../app/api/billing/webhook/route");
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(wire.requests).toHaveLength(0);
  });
  it("웹훅 secret 누락은 요청을 수락하지 않는다", async () => {
    vi.stubEnv("PADDLE_WEBHOOK_SECRET", "");
    const { POST } = await import("../app/api/billing/webhook/route");
    expect((await POST(webhookRequest(completed))).status).toBe(503);
    expect(wire.requests).toHaveLength(0);
  });
  it.each([
    { event_type: "transaction.updated", data: {} },
    { ...completed, data: { ...completed.data, custom_data: { userId: "invalid" } } },
    { ...refund, data: { ...refund.data, status: "pending_approval" } },
  ])("무관하거나 조건에 맞지 않는 이벤트는 지급 없이 확인한다", async (event) => {
    const { POST } = await import("../app/api/billing/webhook/route");
    expect((await POST(webhookRequest(event))).status).toBe(200);
    expect(wire.requests.filter((request) => !request.url.includes("/products?"))).toHaveLength(0);
  });
  it("승인 환불의 사용자를 원장의 거래 참조로 찾고 회수한다", async () => {
    wire.respond = async (request) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/credit_ledger")) {
        expect(url.searchParams.get("reason")).toBe("eq.purchase");
        expect(url.searchParams.get("ref")).toBe(`eq.${transactionId}`);
        return Response.json([{ user_id: userId, delta: 10 }]);
      }
      expect(url.pathname).toBe("/rest/v1/rpc/revoke_purchase");
      expect(await request.json()).toEqual({
        p_user: userId,
        p_transaction: transactionId,
        p_ref: adjustmentId,
      });
      return Response.json(true);
    };
    const { POST } = await import("../app/api/billing/webhook/route");
    expect((await POST(webhookRequest(refund))).status).toBe(200);
  });
  it("구매보다 먼저 도착한 환불은 재시도를 위해 500이다", async () => {
    wire.respond = () => Response.json([]);
    const { POST } = await import("../app/api/billing/webhook/route");
    expect((await POST(webhookRequest(refund))).status).toBe(500);
  });
  it("DB 오류는 이벤트를 잃지 않도록 500이다", async () => {
    wire.respond = () => databaseError("private storage error", "XX000");
    const { POST } = await import("../app/api/billing/webhook/route");
    const response = await POST(webhookRequest(completed));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("private storage error");
  });
  it.each(["{broken", JSON.stringify({ invalid: true })])(
    "서명된 잘못된 JSON 형식도 처리하지 않는다",
    async (rawBody) => {
      const { POST } = await import("../app/api/billing/webhook/route");
      expect((await POST(webhookRequest(rawBody))).status).toBe(400);
      expect(wire.requests).toHaveLength(0);
    },
  );
});
