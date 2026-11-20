import { z } from "zod";

export const priceIdSchema = z.string().regex(/^pri_[a-z\d]{26}$/);
export const transactionIdSchema = z.string().regex(/^txn_[a-z\d]{26}$/);
export const adjustmentIdSchema = z.string().regex(/^adj_[a-z\d]{26}$/);
export type Catalog = { readonly priceId: string; readonly credits: number };

export function parseCatalog(env: {
  readonly priceId: string | undefined;
  readonly credits: string | undefined;
}): Catalog | null {
  const parsed = z
    .object({
      priceId: priceIdSchema,
      credits: z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform(Number)
        .pipe(z.number().int().max(2147483647)),
    })
    .safeParse({ priceId: env.priceId, credits: env.credits ?? "1" });
  return parsed.success ? parsed.data : null;
}
