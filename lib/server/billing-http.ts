import "server-only";
import { BillingStoreError } from "@/lib/server/billing-store";
import { apiError } from "@/lib/server/http";
import { PaddleError } from "@/lib/server/paddle";
import { globalLlmLimit, rateLimit } from "@/lib/server/rate-limit";

const headers = { "Cache-Control": "no-store" } as const;
export function billingJson(data: unknown): Response {
  return Response.json(data, { headers });
}
export function billingError(code: string, message: string, status: number): Response {
  return apiError(code, message, status, headers);
}
export function billingFailure(error: unknown): Response {
  if (error instanceof SyntaxError)
    return billingError("INVALID_JSON", "올바른 요청 형식이 아니에요.", 400);
  if (error instanceof BillingStoreError) {
    switch (error.code) {
      case "COUPON_NOT_FOUND":
        return billingError(error.code, "쿠폰을 찾을 수 없어요.", 404);
      case "COUPON_EXPIRED":
        return billingError(error.code, "만료된 쿠폰이에요.", 410);
      case "COUPON_EXHAUSTED":
        return billingError(error.code, "모두 사용된 쿠폰이에요.", 410);
      case "COUPON_ALREADY_USED":
        return billingError(error.code, "이미 사용한 쿠폰이에요.", 409);
      case "INSUFFICIENT_CREDITS":
        return billingError(error.code, "크레딧이 부족해요.", 402);
      case "PURCHASE_NOT_FOUND":
      case "DATABASE_ERROR":
        break;
      default: {
        const exhaustive: never = error.code;
        return exhaustive;
      }
    }
  }
  if (error instanceof PaddleError) {
    switch (error.code) {
      case "PRODUCT_NOT_FOUND":
        return billingError(error.code, "구매 가능한 상품을 찾을 수 없어요.", 400);
      case "BILLING_DISABLED":
        return billingError(error.code, "결제 서비스를 준비 중이에요.", 503);
      case "CHECKOUT_FAILED":
        console.error("Paddle checkout failed");
        return billingError(error.code, "결제를 시작하지 못했어요.", 502);
      default: {
        const exhaustive: never = error.code;
        return exhaustive;
      }
    }
  }
  if (!(error instanceof Error)) throw error;
  console.error(`Billing request failed: ${error.name}`);
  return billingError(
    "BILLING_FAILED",
    "요청을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
    500,
  );
}
function limitResponse(
  limit: { readonly success: boolean; readonly reset: number },
  global: boolean,
) {
  return limit.success
    ? null
    : apiError(
        global ? "BUSY" : "RATE_LIMIT",
        global
          ? "지금 사람이 많아요! 1분 뒤 다시 시도해 주세요."
          : "잠깐 쉬어 가요! 10분 뒤 다시 시도해 주세요.",
        global ? 503 : 429,
        {
          ...headers,
          "Retry-After": String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))),
        },
      );
}
export async function billingUserLimit(userId: string, policy: "coupon" | "report") {
  return limitResponse(await rateLimit(userId, policy), false);
}
export async function billingLlmLimit() {
  return limitResponse(await globalLlmLimit(), true);
}
