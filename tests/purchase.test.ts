import { describe, expect, it } from "vitest";
import { checkPurchase, formatPrice, purchasePollTimeoutMs } from "../lib/purchase";

describe("checkPurchase", () => {
  it.each([
    [0, 10, 0, "credited"],
    [3, 4, purchasePollTimeoutMs + 5000, "credited"],
    [0, 0, 0, "waiting"],
    [2, 2, purchasePollTimeoutMs - 1, "waiting"],
    [0, 0, purchasePollTimeoutMs, "timeout"],
    [5, 3, purchasePollTimeoutMs + 1, "timeout"],
  ] as const)("이전 잔액 %i, 현재 %i, 경과 %ims이면 %s", (previous, balance, elapsed, expected) => {
    expect(checkPurchase(previous, balance, elapsed)).toBe(expected);
  });
});

describe("formatPrice", () => {
  it("원화는 천 단위 구분과 원을 붙인다", () => {
    expect(formatPrice(4900, "KRW")).toBe("4,900원");
  });
  it("다른 통화는 소수 단위를 변환해 통화 형식으로 보여 준다", () => {
    expect(formatPrice(499, "USD")).toContain("4.99");
  });
});
