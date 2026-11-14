import { exampleResult } from "@/lib/core/example";
import { signToken, toSharePayload } from "@/lib/core/share-token";
import { apiError, clientIp } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { shareSecret } from "@/lib/server/share-secret";

export async function POST(request: Request) {
  const limit = await rateLimit(clientIp(request));
  if (!limit.success)
    return apiError("RATE_LIMIT", "잠깐 쉬어 가요! 10분 뒤 다시 시도해 주세요.", 429);
  return Response.json(
    {
      result: exampleResult,
      shareToken: await signToken(toSharePayload(exampleResult), shareSecret()),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
