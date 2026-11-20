import "server-only";
import { z } from "zod";
import { transactionIdSchema } from "@/lib/core/billing/catalog";
import { billingCatalog } from "@/lib/server/billing-store";

export class PaddleError extends Error {
  constructor(readonly code: "BILLING_DISABLED" | "CHECKOUT_FAILED" | "PRODUCT_NOT_FOUND") {
    super(code);
    this.name = "PaddleError";
  }
}
export async function createTransaction(
  userId: string,
  input: {
    readonly priceId: string;
    readonly posthogId?: string | undefined;
  },
): Promise<string> {
  const environment = z.enum(["sandbox", "production"]).safeParse(process.env.PADDLE_ENV);
  const key = process.env.PADDLE_API_KEY;
  if (!environment.success || !key || !process.env.PADDLE_WEBHOOK_SECRET)
    throw new PaddleError("BILLING_DISABLED");
  const catalog = await billingCatalog();
  if (!catalog.some((product) => product.priceId === input.priceId && product.active))
    throw new PaddleError("PRODUCT_NOT_FOUND");
  const base =
    environment.data === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
  try {
    // Creation is deliberately not retried: a retry could create a second payable transaction.
    const response = await fetch(`${base}/transactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        items: [{ price_id: input.priceId, quantity: 1 }],
        collection_mode: "automatic",
        custom_data: { userId, ...(input.posthogId ? { posthogId: input.posthogId } : {}) },
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
