import { z } from "zod";
import { adjustmentIdSchema, type Catalog, priceIdSchema, transactionIdSchema } from "./catalog";
import { currencySchema, minorAmountSchema } from "./contracts";

export const webhookEnvelopeSchema = z.object({ event_type: z.string(), data: z.unknown() });
const completedSchema = z.object({
  id: transactionIdSchema,
  status: z.literal("completed"),
  custom_data: z.object({ userId: z.uuid() }),
  items: z.array(
    z.object({ price: z.object({ id: priceIdSchema }), quantity: z.number().int().positive() }),
  ),
});
const adjustmentSchema = z.object({
  id: adjustmentIdSchema,
  action: z.literal("refund"),
  status: z.literal("approved"),
  transaction_id: transactionIdSchema,
});
const identitySchema = z.object({
  custom_data: z.object({ posthogId: z.string().min(1).max(200) }),
});
const paymentSchema = identitySchema.extend({
  currency_code: currencySchema,
  details: z.object({ totals: z.object({ total: minorAmountSchema }) }),
});
export type WebhookDecision =
  | {
      readonly kind: "grant";
      readonly userId: string;
      readonly credits: number;
      readonly ref: string;
      readonly analytics?: {
        readonly posthogId: string;
        readonly amount: number;
        readonly currency: string;
      };
    }
  | {
      readonly kind: "revoke";
      readonly transactionId: string;
      readonly ref: string;
      readonly posthogId?: string;
    }
  | { readonly kind: "ignore" };

export function decideWebhook(
  event: z.infer<typeof webhookEnvelopeSchema>,
  catalog: Catalog,
): WebhookDecision {
  switch (event.event_type) {
    case "transaction.completed": {
      const parsed = completedSchema.safeParse(event.data);
      if (!parsed.success) return { kind: "ignore" };
      const credits = parsed.data.items.reduce(
        (total, item) =>
          total +
          item.quantity *
            (catalog.find((product) => product.priceId === item.price.id)?.credits ?? 0),
        0,
      );
      if (!Number.isSafeInteger(credits) || credits < 1 || credits > 2147483647)
        return { kind: "ignore" };
      const payment = paymentSchema.safeParse(event.data);
      return {
        kind: "grant",
        userId: parsed.data.custom_data.userId,
        credits,
        ref: parsed.data.id,
        ...(payment.success
          ? {
              analytics: {
                posthogId: payment.data.custom_data.posthogId,
                amount: payment.data.details.totals.total,
                currency: payment.data.currency_code,
              },
            }
          : {}),
      };
    }
    case "adjustment.created":
    case "adjustment.updated": {
      const parsed = adjustmentSchema.safeParse(event.data);
      const identity = identitySchema.safeParse(event.data);
      return parsed.success
        ? {
            kind: "revoke",
            transactionId: parsed.data.transaction_id,
            ref: parsed.data.id,
            ...(identity.success ? { posthogId: identity.data.custom_data.posthogId } : {}),
          }
        : { kind: "ignore" };
    }
    default:
      // Paddle has an open-ended event namespace; unrelated events are acknowledged.
      return { kind: "ignore" };
  }
}
