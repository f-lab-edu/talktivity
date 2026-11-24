import { reportResponseSchema, reportsListResponseSchema } from "@/lib/core/billing/contracts";
import { generatePaidReport } from "@/lib/core/billing/report";
import { prepareConversation } from "@/lib/core/mask";
import { speakersIn } from "@/lib/core/parse-kakao";
import { requestSchema } from "@/lib/core/schema";
import { analyzerConfig, systemPrompt } from "@/lib/server/ai-config";
import { authenticate } from "@/lib/server/auth";
import {
  billingError,
  billingFailure,
  billingJson,
  billingLlmLimit,
  billingUserLimit,
} from "@/lib/server/billing-http";
import { creditBalance, listReports, saveReport } from "@/lib/server/billing-store";

export async function GET(request: Request) {
  try {
    const user = await authenticate(request);
    if (user instanceof Response) return user;
    return billingJson(reportsListResponseSchema.parse({ reports: await listReports(user.id) }));
  } catch (error) {
    return billingFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await authenticate(request);
    if (user instanceof Response) return user;
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return billingError("INVALID_INPUT", "대화와 관계를 확인해 주세요.", 400);
    const speakers = speakersIn(parsed.data.conversation);
    if (
      speakers.length >= 2 &&
      (!parsed.data.mySpeaker || !speakers.includes(parsed.data.mySpeaker))
    )
      return billingError("SPEAKER_REQUIRED", "나는 누구인지 선택해 주세요.", 400);
    if ((await creditBalance(user.id)) < 1)
      return billingError("INSUFFICIENT_CREDITS", "크레딧이 부족해요.", 402);
    const limited = await billingUserLimit(user.id, "report");
    if (limited) return limited;
    const busy = await billingLlmLimit();
    if (busy) return busy;
    const content = await generatePaidReport(
      {
        conversation: prepareConversation(
          parsed.data.conversation,
          parsed.data.mySpeaker ?? speakers[0],
        ),
        relationship: parsed.data.relationship,
      },
      analyzerConfig(),
      systemPrompt("REPORT_SYSTEM_PROMPT"),
    );
    const report = await saveReport(user.id, content);
    return billingJson(
      reportResponseSchema.parse({ report, balance: await creditBalance(user.id) }),
    );
  } catch (error) {
    return billingFailure(error);
  }
}
