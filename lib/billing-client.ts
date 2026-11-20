"use client";

import type { z } from "zod";
import { authFetch } from "@/lib/auth-client";
import {
  checkoutResponseSchema,
  creditsResponseSchema,
  reportResponseSchema,
  reportsListResponseSchema,
} from "@/lib/core/billing/contracts";
import { couponRedeemResponseSchema } from "@/lib/core/billing/coupon";
import { type AnalysisRequest, errorSchema } from "@/lib/core/schema";

export type Credits = z.infer<typeof creditsResponseSchema>;
export type Product = Credits["products"][number];
export type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly code: string };

async function call<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const response = await authFetch(path, init);
    const json: unknown = await response.json();
    if (!response.ok) {
      const failure = errorSchema.safeParse(json);
      return { ok: false, code: failure.success ? failure.data.error.code : "HTTP_ERROR" };
    }
    const parsed = schema.safeParse(json);
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, code: "BAD_RESPONSE" };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { ok: false, code: "NETWORK_ERROR" };
  }
}

function post(body: unknown, init?: RequestInit): RequestInit {
  return {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const getCredits = () => call("/api/credits", creditsResponseSchema);
export const getReports = () => call("/api/reports", reportsListResponseSchema);
export const getReport = (id: string) =>
  call(`/api/reports/${encodeURIComponent(id)}`, reportResponseSchema);
export const postCoupon = (code: string) =>
  call("/api/coupons/redeem", couponRedeemResponseSchema, post({ code }));
export const postCheckout = (priceId: string, posthogId: string | undefined) =>
  call("/api/billing/checkout", checkoutResponseSchema, post({ priceId, posthogId }));
// Report generation runs the model twice at worst, so it gets a longer budget than other calls.
export const postReport = (request: AnalysisRequest) =>
  call(
    "/api/reports",
    reportResponseSchema,
    post(request, { signal: AbortSignal.timeout(60_000) }),
  );

const couponMessages: Readonly<Record<string, string>> = {
  COUPON_INVALID: "쿠폰 코드를 다시 확인해 주세요.",
  COUPON_NOT_FOUND: "존재하지 않는 쿠폰이에요.",
  COUPON_EXPIRED: "기간이 지난 쿠폰이에요.",
  COUPON_EXHAUSTED: "모두 사용된 쿠폰이에요.",
  COUPON_ALREADY_USED: "이미 사용한 쿠폰이에요.",
  RATE_LIMIT: "시도가 너무 많아요. 잠시 후 다시 입력해 주세요.",
  BUSY: "지금 요청이 몰리고 있어요. 잠시 후 다시 시도해 주세요.",
};
const checkoutMessages: Readonly<Record<string, string>> = {
  BILLING_UNAVAILABLE: "이 계정에서는 아직 결제를 이용할 수 없어요.",
  BILLING_DISABLED: "결제 서비스를 준비 중이에요.",
  PRODUCT_NOT_FOUND: "지금은 구매할 수 없는 상품이에요. 새로고침해 주세요.",
  RATE_LIMIT: "시도가 너무 많아요. 잠시 후 다시 시도해 주세요.",
};
const reportMessages: Readonly<Record<string, string>> = {
  INSUFFICIENT_CREDITS: "크레딧이 부족해요.",
  INVALID_INPUT: "분석한 대화 정보가 올바르지 않아요. 대화를 다시 분석해 주세요.",
  SPEAKER_REQUIRED: "분석한 대화 정보가 올바르지 않아요. 대화를 다시 분석해 주세요.",
  RATE_LIMIT: "시도가 너무 많아요. 잠시 후 다시 시도해 주세요.",
  BUSY: "지금 요청이 몰리고 있어요. 잠시 후 다시 시도해 주세요.",
};

export const couponMessage = (code: string) =>
  couponMessages[code] ?? "쿠폰을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.";
export const checkoutMessage = (code: string) =>
  checkoutMessages[code] ?? "결제를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.";
export const reportMessage = (code: string) =>
  reportMessages[code] ?? "리포트를 만들지 못했어요. 잠시 후 다시 시도해 주세요.";
