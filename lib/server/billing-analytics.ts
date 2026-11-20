import "server-only";

type BillingEvent =
  | {
      readonly event: "payment_success";
      readonly properties: {
        readonly credits: number;
        readonly amount: number;
        readonly currency: string;
      };
    }
  | { readonly event: "refund_processed"; readonly properties: { readonly credits: number } };

export async function captureBillingEvent(distinctId: string, event: BillingEvent): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return;
  try {
    const response = await fetch(`${host.replace(/\/+$/, "")}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3_000),
      body: JSON.stringify({ api_key: key, distinct_id: distinctId, ...event }),
    });
    if (!response.ok)
      console.warn("Billing analytics capture rejected", { status: response.status });
  } catch (error) {
    // no-excuse-ok: catch - telemetry boundary must preserve the webhook acknowledgment.
    console.warn("Billing analytics capture failed", {
      error: error instanceof Error ? error.name : "Unknown",
    });
  }
}
