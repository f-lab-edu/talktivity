import { z } from "zod";

export function normalizeCoupon(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

// Normalization happens at the route boundary before this wire schema is parsed.
export const couponCodeSchema = z.string().regex(/^[A-Z0-9-]{4,32}$/);
export const couponRedeemRequestSchema = z.object({ code: couponCodeSchema }).strict();
export const couponRedeemResponseSchema = z
  .object({
    credited: z.number().int().positive(),
    balance: z.number().int(),
  })
  .strict();
