import { z } from "zod";

export const reportTitle = "상대방 속마음 정밀 리포트 + 맞춤 답장 3개";
export const fallbackTier = 4900;

export const purchasePollIntervalMs = 2000;
export const purchasePollTimeoutMs = 30_000;
const pendingPurchaseKey = "talktivity:pending-purchase";

export type PurchaseCheck = "credited" | "waiting" | "timeout";

// Decides one polling round: a balance above the pre-checkout balance means the webhook credited us.
export function checkPurchase(
  previousBalance: number,
  balance: number,
  elapsedMs: number,
): PurchaseCheck {
  if (balance > previousBalance) return "credited";
  return elapsedMs >= purchasePollTimeoutMs ? "timeout" : "waiting";
}

const pendingBalanceSchema = z.coerce.number().int().nonnegative();

export function savePendingPurchase(previousBalance: number) {
  try {
    sessionStorage.setItem(pendingPurchaseKey, String(previousBalance));
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }
}

export function loadPendingPurchase(): number | null {
  try {
    const saved = sessionStorage.getItem(pendingPurchaseKey);
    if (saved === null) return null;
    const parsed = pendingBalanceSchema.safeParse(saved);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return null;
  }
}

export function clearPendingPurchase() {
  try {
    sessionStorage.removeItem(pendingPurchaseKey);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }
}

// `amount` is in the currency's minor unit; KRW has none, so the amount is already won.
export function formatPrice(amount: number, currency: string): string {
  if (currency === "KRW") return `${amount.toLocaleString("ko-KR")}원`;
  const format = new Intl.NumberFormat("ko-KR", { style: "currency", currency });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
  return format.format(amount / 10 ** digits);
}
