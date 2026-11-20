import "server-only";
import { z } from "zod";
import { storedReportSchema } from "@/lib/core/billing/contracts";
import type { PaidReport } from "@/lib/core/billing/report";
import { supabaseAdmin } from "@/lib/server/supabase";

const failureCodeSchema = z.enum([
  "COUPON_NOT_FOUND",
  "COUPON_EXPIRED",
  "COUPON_EXHAUSTED",
  "COUPON_ALREADY_USED",
  "INSUFFICIENT_CREDITS",
  "PURCHASE_NOT_FOUND",
  "DATABASE_ERROR",
]);
export class BillingStoreError extends Error {
  constructor(readonly code: z.infer<typeof failureCodeSchema>) {
    super(code);
    this.name = "BillingStoreError";
  }
}
function storeError(error: { readonly code: string; readonly message: string }): BillingStoreError {
  const parsed = failureCodeSchema.safeParse(error.message);
  return new BillingStoreError(
    error.code === "P0001" && parsed.success ? parsed.data : "DATABASE_ERROR",
  );
}

export async function creditBalance(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin().rpc("credit_balance", { p_user: userId });
  if (error) throw storeError(error);
  return z.number().int().parse(data);
}
export async function grantCredits(grant: {
  readonly userId: string;
  readonly credits: number;
  readonly ref: string;
}): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("grant_credits", {
    p_user: grant.userId,
    p_delta: grant.credits,
    p_reason: "purchase",
    p_ref: grant.ref,
  });
  if (error) throw storeError(error);
  return z.boolean().parse(data);
}
export async function redeemCoupon(userId: string, code: string): Promise<number> {
  const { data, error } = await supabaseAdmin().rpc("redeem_coupon", {
    p_user: userId,
    p_code: code,
  });
  if (error) throw storeError(error);
  return z.number().int().positive().parse(data);
}
export async function getReport(userId: string, id: string) {
  const { data, error } = await supabaseAdmin()
    .from("reports")
    .select("id, content, created_at")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw storeError(error);
  return data
    ? storedReportSchema.parse({ id: data.id, content: data.content, createdAt: data.created_at })
    : null;
}
export async function saveReport(userId: string, content: PaidReport) {
  const { data, error } = await supabaseAdmin().rpc("save_report", {
    p_user: userId,
    p_content: content,
  });
  if (error) throw storeError(error);
  const report = await getReport(userId, z.uuid().parse(data));
  if (!report) throw new BillingStoreError("DATABASE_ERROR");
  return report;
}
export async function listReports(userId: string) {
  const { data, error } = await supabaseAdmin()
    .from("reports")
    .select("id, content->>headline, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw storeError(error);
  return z
    .array(
      z.object({
        id: z.uuid(),
        headline: z.string().min(1).max(60),
        created_at: z.iso.datetime({ offset: true }),
      }),
    )
    .parse(data)
    .map((row) => ({ id: row.id, headline: row.headline, createdAt: row.created_at }));
}
export async function revokePurchase(transactionId: string, ref: string): Promise<boolean> {
  const purchase = await supabaseAdmin()
    .from("credit_ledger")
    .select("user_id")
    .eq("reason", "purchase")
    .eq("ref", transactionId)
    .maybeSingle();
  if (purchase.error) throw storeError(purchase.error);
  if (!purchase.data) throw new BillingStoreError("PURCHASE_NOT_FOUND");
  const { data, error } = await supabaseAdmin().rpc("revoke_purchase", {
    p_user: purchase.data.user_id,
    p_transaction: transactionId,
    p_ref: ref,
  });
  if (error) throw storeError(error);
  return z.boolean().parse(data);
}
