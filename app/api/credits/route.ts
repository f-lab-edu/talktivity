import { creditsResponseSchema } from "@/lib/core/billing/contracts";
import { authenticate } from "@/lib/server/auth";
import { billingFailure, billingJson } from "@/lib/server/billing-http";
import { creditBalance } from "@/lib/server/billing-store";

export async function GET(request: Request) {
  try {
    const user = await authenticate(request);
    if (user instanceof Response) return user;
    return billingJson(creditsResponseSchema.parse({ balance: await creditBalance(user.id) }));
  } catch (error) {
    return billingFailure(error);
  }
}
