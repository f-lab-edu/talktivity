import { analyze } from "@/lib/core/analyzer";
import { prepareConversation } from "@/lib/core/mask";
import { speakersIn } from "@/lib/core/parse-kakao";
import { requestSchema, resultSchema } from "@/lib/core/schema";
import { signToken, toSharePayload } from "@/lib/core/share-token";
import { apiError, clientIp } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { shareSecret } from "@/lib/server/share-secret";

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(clientIp(request), "analyze");
    if (!limit.success)
      return apiError("RATE_LIMIT", "잠깐 쉬어 가요! 10분 뒤 다시 분석해 주세요.", 429, {
        "Retry-After": String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))),
      });
    const secret = shareSecret();
    const body: unknown = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success)
      return apiError(
        "INVALID_INPUT",
        "대화와 관계를 확인해 주세요. 대화는 10~1,500자로 두 줄 이상 입력해 주세요.",
        400,
      );
    const speakers = speakersIn(parsed.data.conversation);
    if (
      speakers.length >= 2 &&
      (!parsed.data.mySpeaker || !speakers.includes(parsed.data.mySpeaker))
    ) {
      return apiError("SPEAKER_REQUIRED", "나는 누구인지 선택해 주세요.", 400);
    }
    const masked = {
      conversation: prepareConversation(
        parsed.data.conversation,
        parsed.data.mySpeaker ?? speakers[0],
      ),
      relationship: parsed.data.relationship,
    };
    const result = resultSchema.parse(
      await analyze(masked, {
        provider: process.env.LLM_PROVIDER,
        anthropicKey: process.env.ANTHROPIC_API_KEY,
        openaiKey: process.env.OPENAI_API_KEY,
        googleKey: process.env.GEMINI_API_KEY,
        model: process.env.LLM_MODEL,
      }),
    );
    const shareToken = await signToken(toSharePayload(result), secret);
    return Response.json({ result, shareToken }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError)
      return apiError("INVALID_JSON", "올바른 요청 형식이 아니에요.", 400);
    if (error instanceof Error) {
      console.error(`/api/analyze failed: ${error.name}: ${error.message}`);
      return apiError(
        "ANALYZE_FAILED",
        "분석을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
        500,
      );
    }
    throw error;
  }
}
