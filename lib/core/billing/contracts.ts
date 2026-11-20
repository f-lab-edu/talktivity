import { z } from "zod";
import { transactionIdSchema } from "./catalog";
import { paidReportSchema } from "./report";

export const creditsResponseSchema = z.object({ balance: z.number().int() }).strict();
export const checkoutRequestSchema = z
  .object({
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
