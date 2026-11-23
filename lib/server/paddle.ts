import "server-only";
import { z } from "zod";
import { transactionIdSchema } from "@/lib/core/billing/catalog";
import { currencySchema, minorAmountSchema } from "@/lib/core/billing/contracts";
import { billingCatalog } from "@/lib/server/billing-store";

export class PaddleError extends Error {
  constructor(
    readonly code:
      | "BILLING_DISABLED"
      | "BILLING_UNAVAILABLE"
      | "CHECKOUT_FAILED"
      | "PRODUCT_NOT_FOUND",
  ) {
    super(code);
    this.name = "PaddleError";
  }
}
function paddleConfig() {
  const environment = z.enum(["sandbox", "production"]).safeParse(process.env.PADDLE_ENV);
  const key = process.env.PADDLE_API_KEY;
  if (!environment.success || !key || !process.env.PADDLE_WEBHOOK_SECRET) return null;
  return {
    environment: environment.data,
    key,
    base:
      environment.data === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com",
  };
}
function userCanPurchase(userId: string, environment: "sandbox" | "production"): boolean {
  if (environment === "production") return true;
  return (process.env.BILLING_TEST_USER_IDS ?? "").split(",").some((value) => {
    const parsed = z.uuid().safeParse(value.trim());
    return parsed.success && parsed.data.toLowerCase() === userId.toLowerCase();
  });
}

const priceResponseSchema = z.object({
  data: z.object({
    unit_price: z.object({ amount: minorAmountSchema, currency_code: currencySchema }),
  }),
});
// Instance-local cache; the environment is part of the key to isolate sandbox prices.
const priceCache = new Map<
  string,
  {
    readonly expiresAt: number;
    readonly amount: number;
    readonly currency: string;
  }
>();
export async function purchaseProducts(userId: string) {
  const config = paddleConfig();
  if (!config || !userCanPurchase(userId, config.environment)) return [];
  return pricedCatalog();
}
export async function pricedCatalog() {
  const config = paddleConfig();
  if (!config) return [];
  const products = (await billingCatalog()).filter((product) => product.active);
  const priced = await Promise.all(
    products.map(async (product) => {
      const cacheKey = `${config.base}/${product.priceId}`;
      const cached = priceCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now())
        return {
          priceId: product.priceId,
          name: product.name,
          credits: product.credits,
          amount: cached.amount,
          currency: cached.currency,
        };
      try {
        const response = await fetch(`${config.base}/prices/${product.priceId}`, {
          headers: { Authorization: `Bearer ${config.key}` },
          signal: AbortSignal.timeout(3_000),
          cache: "no-store",
        });
        if (!response.ok) throw new PaddleError("CHECKOUT_FAILED");
        const { amount, currency_code: currency } = priceResponseSchema.parse(await response.json())
          .data.unit_price;
        priceCache.set(cacheKey, { amount, currency, expiresAt: Date.now() + 10 * 60_000 });
        return {
          priceId: product.priceId,
          name: product.name,
          credits: product.credits,
          amount,
          currency,
        };
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        console.warn("Paddle price unavailable", { priceId: product.priceId, error: error.name });
        return null;
      }
    }),
  );
  return priced.filter((product) => product !== null);
}
export async function createTransaction(
  userId: string,
  input: {
    readonly priceId: string;
    readonly posthogId?: string | undefined;
  },
): Promise<string> {
  const config = paddleConfig();
  if (!config) throw new PaddleError("BILLING_DISABLED");
  if (!userCanPurchase(userId, config.environment)) throw new PaddleError("BILLING_UNAVAILABLE");
  const catalog = await billingCatalog();
  if (!catalog.some((product) => product.priceId === input.priceId && product.active))
    throw new PaddleError("PRODUCT_NOT_FOUND");
  try {
    // Creation is deliberately not retried: a retry could create a second payable transaction.
    const response = await fetch(`${config.base}/transactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
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
