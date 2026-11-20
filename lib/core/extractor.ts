import { generateText, Output } from "ai";
import { z } from "zod";
import { type AnalyzerConfig, createModel } from "./analyzer";
import { exampleConversation } from "./example";
import { maskPII } from "./mask";

export type ScreenshotImage = { readonly data: Uint8Array; readonly mediaType: string };
export type ExtractOutcome =
  | { readonly ok: true; readonly conversation: string }
  | { readonly ok: false; readonly reason: "not_chat" | "too_short" | "failed" };

const maxConversationLength = 1500;
const extractionSchema = z.object({
  isKakaoChat: z.boolean(),
  messages: z
    .array(z.object({ speaker: z.enum(["나", "상대"]), text: z.string().max(300) }))
    .max(80),
});

export function latestConversationWithinLimit(
  messages: readonly { speaker: string; text: string }[],
): string {
  const lines: string[] = [];
  let length = 0;
  for (const message of [...messages].reverse()) {
    const text = maskPII(message.text.replace(/\s+/g, " ").trim());
    if (!text) continue;
    const line = `${message.speaker}: ${text}`;
    const added = line.length + (lines.length ? 1 : 0);
    if (length + added > maxConversationLength) break;
    lines.unshift(line);
    length += added;
  }
  return lines.join("\n");
}

export async function extractConversation(
  images: readonly ScreenshotImage[],
  config: AnalyzerConfig,
  systemPrompt: string | undefined,
): Promise<ExtractOutcome> {
  const model = createModel(config);
  if (!model || !systemPrompt)
    return { ok: true, conversation: exampleConversation.replaceAll("친구:", "상대:") };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await generateText({
        model,
        output: Output.object({ schema: extractionSchema }),
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(25_000),
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `캡처 ${images.length}장입니다.` },
              ...images.map((image) => ({
                type: "file" as const,
                data: image.data,
                mediaType: image.mediaType,
              })),
            ],
          },
        ],
      });
      const output = extractionSchema.parse(response.output);
      if (!output.isKakaoChat) return { ok: false, reason: "not_chat" };
      const conversation = latestConversationWithinLimit(output.messages);
      if (conversation.split("\n").length < 2) return { ok: false, reason: "too_short" };
      return { ok: true, conversation };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      // Log only error metadata, never image contents.
      console.warn(`LLM extract attempt ${attempt + 1} failed: ${error.name}`);
    }
  }
  return { ok: false, reason: "failed" };
}
