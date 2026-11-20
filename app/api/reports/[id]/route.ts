import { z } from "zod";
import { reportResponseSchema } from "@/lib/core/billing/contracts";
import { authenticate } from "@/lib/server/auth";
import { billingError, billingFailure, billingJson } from "@/lib/server/billing-http";
import { creditBalance, getReport } from "@/lib/server/billing-store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticate(request);
    if (user instanceof Response) return user;
    const id = z.uuid().safeParse((await context.params).id);
    if (!id.success) return billingError("REPORT_NOT_FOUND", "리포트를 찾을 수 없어요.", 404);
    const report = await getReport(user.id, id.data);
    if (!report) return billingError("REPORT_NOT_FOUND", "리포트를 찾을 수 없어요.", 404);
    return billingJson(
      reportResponseSchema.parse({ report, balance: await creditBalance(user.id) }),
    );
  } catch (error) {
    return billingFailure(error);
  }
}
