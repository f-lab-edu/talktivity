import "server-only";
import { z } from "zod";
import { parseCatalog, transactionIdSchema } from "@/lib/core/billing/catalog";

export class PaddleError extends Error {
  constructor(readonly code: "BILLING_DISABLED" | "CHECKOUT_FAILED") {
    super(code);
    this.name = "PaddleError";
  }
}
export function billingCatalog() {
  return parseCatalog({
    priceId: process.env.PADDLE_PRICE_ID,
    credits: process.env.CREDITS_PER_PURCHASE,
  });
}
export async function createTransaction(userId: string, posthogId?: string): Promise<string> {
  const environment = z.enum(["sandbox", "production"]).safeParse(process.env.PADDLE_ENV);
  const key = process.env.PADDLE_API_KEY;
  const catalog = billingCatalog();
  if (!environment.success || !key || !process.env.PADDLE_WEBHOOK_SECRET || !catalog)
    throw new PaddleError("BILLING_DISABLED");
  const base =
    environment.data === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
  try {
    // Creation is deliberately not retried: a retry could create a second payable transaction.
    const response = await fetch(`${base}/transactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        items: [{ price_id: catalog.priceId, quantity: 1 }],
        collection_mode: "automatic",
        custom_data: { userId, ...(posthogId ? { posthogId } : {}) },
      }),
    });
    if (!response.ok) throw new PaddleError("CHECKOUT_FAILED");
    return z.object({ data: z.object({ id: transactionIdSchema }) }).parse(await response.json())
      .data.id;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new PaddleError("CHECKOUT_FAILED");
  }
}
