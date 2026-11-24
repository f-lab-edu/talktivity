import { creditsResponseSchema } from "@/lib/core/billing/contracts";
import { authenticate } from "@/lib/server/auth";
import { billingFailure, billingJson } from "@/lib/server/billing-http";
import { creditBalance } from "@/lib/server/billing-store";
import { purchaseProducts } from "@/lib/server/paddle";

export async function GET(request: Request) {
  try {
    const user = await authenticate(request);
    if (user instanceof Response) return user;
    const [balance, products] = await Promise.all([
      creditBalance(user.id),
      purchaseProducts(user.id),
    ]);
    return billingJson(creditsResponseSchema.parse({ balance, products }));
  } catch (error) {
    return billingFailure(error);
  }
}
