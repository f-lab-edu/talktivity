import { z } from "zod";
import {
  couponRedeemRequestSchema,
  couponRedeemResponseSchema,
  normalizeCoupon,
} from "@/lib/core/billing/coupon";
import { authenticate } from "@/lib/server/auth";
import {
  billingError,
  billingFailure,
  billingJson,
  billingUserLimit,
} from "@/lib/server/billing-http";
import { creditBalance, redeemCoupon } from "@/lib/server/billing-store";

const inputSchema = z.object({ code: z.string() }).strict();
export async function POST(request: Request) {
  try {
    const user = await authenticate(request);
    if (user instanceof Response) return user;
    const limited = await billingUserLimit(user.id, "coupon");
    if (limited) return limited;
    const input = inputSchema.safeParse(await request.json());
    if (!input.success) return billingError("COUPON_INVALID", "쿠폰 코드를 확인해 주세요.", 400);
    const parsed = couponRedeemRequestSchema.safeParse({ code: normalizeCoupon(input.data.code) });
    if (!parsed.success) return billingError("COUPON_INVALID", "쿠폰 코드를 확인해 주세요.", 400);
    const credited = await redeemCoupon(user.id, parsed.data.code);
    return billingJson(
      couponRedeemResponseSchema.parse({ credited, balance: await creditBalance(user.id) }),
    );
  } catch (error) {
    return billingFailure(error);
  }
}
