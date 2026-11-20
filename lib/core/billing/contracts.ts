import { z } from "zod";
import { priceIdSchema, transactionIdSchema } from "./catalog";
import { paidReportSchema } from "./report";

export const minorAmountSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER));
export const currencySchema = z.string().regex(/^[A-Z]{3}$/);
export const creditsResponseSchema = z
  .object({
    balance: z.number().int(),
    products: z.array(
      z
        .object({
          priceId: priceIdSchema,
          name: z.string(),
          credits: z.number().int().positive(),
          amount: z
            .number()
            .int()
            .nonnegative()
            .max(Number.MAX_SAFE_INTEGER)
            .describe("Integer in the currency's minor unit (KRW: won, USD: cents)."),
          currency: currencySchema,
        })
        .strict(),
    ),
  })
  .strict();
export const checkoutRequestSchema = z
  .object({
    priceId: priceIdSchema,
    posthogId: z.string().max(200).optional(),
  })
  .strict();
export const checkoutResponseSchema = z.object({ transactionId: transactionIdSchema }).strict();
export const storedReportSchema = z
  .object({
    id: z.uuid(),
    content: paidReportSchema,
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const reportResponseSchema = z
  .object({
    report: storedReportSchema,
    balance: z.number().int(),
  })
  .strict();
export const reportsListResponseSchema = z
  .object({
    reports: z
      .array(
        z
          .object({
            id: z.uuid(),
            headline: z.string().min(1).max(60),
            createdAt: z.iso.datetime({ offset: true }),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();
