import { verifyPaddleSignature } from "@/lib/core/billing/paddle-signature";
import { decideWebhook, webhookEnvelopeSchema } from "@/lib/core/billing/webhook";
import { captureBillingEvent } from "@/lib/server/billing-analytics";
import { billingError, billingFailure, billingJson } from "@/lib/server/billing-http";
import { billingCatalog, grantCredits, revokePurchase } from "@/lib/server/billing-store";

export async function POST(request: Request) {
  try {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) return billingError("BILLING_DISABLED", "결제 서비스를 준비 중이에요.", 503);
    const rawBody = await request.text();
    if (
      !(await verifyPaddleSignature(
        { rawBody, signature: request.headers.get("Paddle-Signature") },
        secret,
      ))
    )
      return billingError("INVALID_SIGNATURE", "웹훅 서명을 확인해 주세요.", 401);
    const parsed = webhookEnvelopeSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) return billingError("INVALID_WEBHOOK", "웹훅 형식을 확인해 주세요.", 400);
    const decision = decideWebhook(
      parsed.data,
      parsed.data.event_type === "transaction.completed" ? await billingCatalog() : [],
    );
    switch (decision.kind) {
      case "grant": {
        const applied = await grantCredits(decision);
        if (applied && decision.analytics)
          await captureBillingEvent(decision.analytics.posthogId, {
            event: "payment_success",
            properties: {
              credits: decision.credits,
              amount: decision.analytics.amount,
              currency: decision.analytics.currency,
            },
          });
        break;
      }
      case "revoke": {
        const result = await revokePurchase(decision.transactionId, decision.ref);
        if (result.applied && decision.posthogId)
          await captureBillingEvent(decision.posthogId, {
            event: "refund_processed",
            properties: { credits: result.credits },
          });
        break;
      }
      case "ignore":
        break;
      default: {
        const exhaustive: never = decision;
        return exhaustive;
      }
    }
    return billingJson({ received: true });
  } catch (error) {
    return billingFailure(error);
  }
}
