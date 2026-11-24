import { extractConversation, type ScreenshotImage } from "@/lib/core/extractor";
import { analyzerConfig, systemPrompt } from "@/lib/server/ai-config";
import { apiError, clientIp } from "@/lib/server/http";
import { globalLlmLimit, rateLimit } from "@/lib/server/rate-limit";

const maxImages = 3;
const maxImageBytes = 2 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(clientIp(request), "extract");
    if (!limit.success)
      return apiError("RATE_LIMIT", "잠깐 쉬어 가요! 10분 뒤 다시 올려 주세요.", 429, {
        "Retry-After": String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))),
      });
    const files = (await request.formData()).getAll("images");
    if (
      files.length < 1 ||
      files.length > maxImages ||
      !files.every(
        (file) => file instanceof File && imageTypes.has(file.type) && file.size <= maxImageBytes,
      )
    )
      return apiError("INVALID_INPUT", "캡처 이미지를 1~3장 올려 주세요.", 400);
    const busy = await globalLlmLimit();
    if (!busy.success)
      return apiError("BUSY", "지금 사람이 많아요! 1분 뒤 다시 시도해 주세요.", 503, {
        "Retry-After": String(Math.max(1, Math.ceil((busy.reset - Date.now()) / 1000))),
      });
    const images: ScreenshotImage[] = await Promise.all(
      (files as File[]).map(async (file) => ({
        data: new Uint8Array(await file.arrayBuffer()),
        mediaType: file.type,
      })),
    );
    const outcome = await extractConversation(
      images,
      analyzerConfig(),
      systemPrompt("EXTRACT_SYSTEM_PROMPT"),
    );
    if (outcome.ok)
      return Response.json(
        { conversation: outcome.conversation },
        { headers: { "Cache-Control": "no-store" } },
      );
    switch (outcome.reason) {
      case "not_chat":
        return apiError(
          "NOT_CHAT",
          "카톡 대화 캡처가 아닌 것 같아요. 대화방 화면을 올려 주세요.",
          422,
        );
      case "too_short":
        return apiError(
          "TOO_SHORT",
          "읽을 수 있는 대화가 너무 적어요. 대화가 더 보이게 캡처해 주세요.",
          422,
        );
      case "failed":
        return apiError("EXTRACT_FAILED", "캡처를 읽지 못했어요. 잠시 후 다시 시도해 주세요.", 502);
      default: {
        const exhaustive: never = outcome.reason;
        return exhaustive;
      }
    }
  } catch (error) {
    if (error instanceof TypeError)
      return apiError("INVALID_INPUT", "캡처 이미지를 1~3장 올려 주세요.", 400);
    if (error instanceof Error) {
      console.error(`/api/extract failed: ${error.name}: ${error.message}`);
      return apiError("EXTRACT_FAILED", "캡처를 읽지 못했어요. 잠시 후 다시 시도해 주세요.", 500);
    }
    throw error;
  }
}
