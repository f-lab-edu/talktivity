import { describe, expect, it } from "vitest";
import { couponCodeSchema, normalizeCoupon } from "../lib/core/billing/coupon";
import { decideWebhook, webhookEnvelopeSchema } from "../lib/core/billing/webhook";

const priceId = "pri_01gsz8z1q1n00f12qt82y31smh";
const transactionId = "txn_01h04vsbhqc62t8hmd4z3b578c";
const adjustmentId = "adj_01ghvjt9dbpnndeqjve8cktgqs";
const userId = "11111111-1111-4111-8111-111111111111";
const catalog = [{ priceId, credits: 5, active: true }];
const completed = {
  event_type: "transaction.completed",
  data: {
    id: transactionId,
    status: "completed",
    custom_data: { userId },
    items: [{ price: { id: priceId }, quantity: 2 }],
  },
};

describe("설정과 쿠폰 경계", () => {
  it("공백·소문자 쿠폰을 정규화한다", () => {
    expect(couponCodeSchema.parse(normalizeCoupon(" we lcome-20 \n"))).toBe("WELCOME-20");
  });
  it.each(["ABC", "A".repeat(33), "한글쿠폰", "AB_C", "AB!C"])(
    "잘못된 쿠폰 %s를 거절한다",
    (code) => {
      expect(couponCodeSchema.safeParse(normalizeCoupon(code)).success).toBe(false);
    },
  );
});

describe("웹훅 결정", () => {
  it("완료된 거래에서 가격과 수량으로 지급량을 계산한다", () => {
    expect(decideWebhook(webhookEnvelopeSchema.parse(completed), catalog)).toEqual({
      kind: "grant",
      userId,
      credits: 10,
      ref: transactionId,
    });
  });
  it("다른 가격은 제외하고 카탈로그 항목만 합산한다", () => {
    const event = {
      ...completed,
      data: {
        ...completed.data,
        items: [
          ...completed.data.items,
          { price: { id: priceId }, quantity: 1 },
          { price: { id: "pri_00000000000000000000000000" }, quantity: 99 },
        ],
      },
    };
    expect(decideWebhook(event, catalog)).toMatchObject({ kind: "grant", credits: 15 });
  });
  it.each([
    { ...completed.data, status: "paid" },
    { ...completed.data, custom_data: null },
    { ...completed.data, custom_data: { userId: "fake" } },
    { ...completed.data, items: [{ price: { id: priceId }, quantity: 0 }] },
    { ...completed.data, items: [] },
    { ...completed.data, items: [{ price: { id: priceId }, quantity: 2147483647 }] },
  ])("불완전한 결제에는 지급하지 않는다", (data) => {
    expect(decideWebhook({ event_type: "transaction.completed", data }, catalog)).toEqual({
      kind: "ignore",
    });
  });
  it("카탈로그가 없거나 관련 없는 이벤트는 무시한다", () => {
    expect(decideWebhook(completed, [])).toEqual({ kind: "ignore" });
    expect(decideWebhook({ event_type: "subscription.created", data: {} }, catalog)).toEqual({
      kind: "ignore",
    });
  });
  it.each(["adjustment.created", "adjustment.updated"])(
    "승인된 환불 %s를 회수로 변환한다",
    (event_type) => {
      expect(
        decideWebhook(
          {
            event_type,
            data: {
              id: adjustmentId,
              action: "refund",
              status: "approved",
              transaction_id: transactionId,
            },
          },
          [],
        ),
      ).toEqual({
        kind: "revoke",
        transactionId,
        ref: adjustmentId,
      });
    },
  );
  it("활성 상품과 비활성 상품의 크레딧을 수량별로 합산한다", () => {
    const inactivePrice = "pri_00000000000000000000000001";
    expect(
      decideWebhook(
        {
          ...completed,
          data: {
            ...completed.data,
            items: [
              ...completed.data.items,
              { price: { id: inactivePrice }, quantity: 3 },
              { price: { id: "pri_00000000000000000000000002" }, quantity: 50 },
            ],
          },
        },
        [...catalog, { priceId: inactivePrice, credits: 7, active: false }],
      ),
    ).toMatchObject({ kind: "grant", credits: 31 });
  });
  it.each([
    { action: "refund", status: "pending_approval" },
    { action: "refund", status: "rejected" },
    { action: "credit", status: "approved" },
  ])("승인된 환불 외 조정은 무시한다", (fields) => {
    expect(
      decideWebhook(
        {
          event_type: "adjustment.updated",
          data: { id: adjustmentId, transaction_id: transactionId, ...fields },
        },
        catalog,
      ),
    ).toEqual({ kind: "ignore" });
  });
});
