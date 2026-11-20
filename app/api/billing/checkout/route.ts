import { checkoutRequestSchema, checkoutResponseSchema } from "@/lib/core/billing/contracts";
import { authenticate } from "@/lib/server/auth";
import { billingError, billingFailure, billingJson } from "@/lib/server/billing-http";
import { createTransaction } from "@/lib/server/paddle";

export async function POST(request: Request) {
  try {
    const user = await authenticate(request);
    if (user instanceof Response) return user;
    const parsed = checkoutRequestSchema.safeParse(await request.json());
    if (!parsed.success) return billingError("INVALID_INPUT", "결제 요청을 확인해 주세요.", 400);
    return billingJson(
      checkoutResponseSchema.parse({
        transactionId: await createTransaction(user.id, parsed.data.posthogId),
      }),
    );
  } catch (error) {
    return billingFailure(error);
  }
}
