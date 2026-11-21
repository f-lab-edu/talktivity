import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { finalizeAnalysisResult } from "./assemble";
import {
  countHints,
  deterministicFeatures,
  groupTurns,
  type HintCounts,
  selectAnalyzedTurns,
} from "./classification";
import { parseKakao } from "./parse-kakao";
import { selectPartnerTurns } from "./partner-temperature";
import {
  type AnalysisRequest,
  type AnalysisResult,
  axisReasonSchema,
  axisScoreSchema,
  partnerTemperatureJudgmentSchema,
  readingSchema,
} from "./schema";

const llmAxisSchema = z.object({ score: axisScoreSchema, reason: axisReasonSchema }).strict();
// The model owns only semantic judgments; strict objects reject code-owned keys such as
// typeCode, length/color or badges. Some providers (Gemini) reject tuple JSON Schemas,
// so roastLines is a fixed-length array here.
export const llmOutputSchema = z
  .object({
    direction: llmAxisSchema,
    stance: llmAxisSchema,
    comedian: z.boolean(),
    roastLines: z.array(z.string().min(1).max(60)).length(3),
    reading: readingSchema,
    partnerTemperature: partnerTemperatureJudgmentSchema,
  })
  .strict();
export type LlmOutput = z.infer<typeof llmOutputSchema>;

export type AnalyzerConfig = {
  readonly provider?: string | undefined;
  readonly anthropicKey?: string | undefined;
  readonly openaiKey?: string | undefined;
  readonly googleKey?: string | undefined;
  readonly model?: string | undefined;
};

export function createModel(config: AnalyzerConfig) {
  return config.provider === "anthropic" && config.anthropicKey
    ? createAnthropic({ apiKey: config.anthropicKey })(config.model || "claude-haiku-5-5")
    : config.provider === "openai" && config.openaiKey
      ? createOpenAI({ apiKey: config.openaiKey })(config.model || "gpt-5.4-mini")
      : config.provider === "google" && config.googleKey
        ? createGoogleGenerativeAI({ apiKey: config.googleKey })(
            config.model || "gemini-3.5-flash-lite",
          )
        : null;
}

export function buildAnalysisPrompt(
  request: AnalysisRequest,
  hints: HintCounts,
  systemPrompt: string,
): { readonly system: string; readonly prompt: string } {
  return {
    system: systemPrompt,
    prompt: JSON.stringify({
      relationship: request.relationship,
      hints,
      partnerHints: countHints(selectPartnerTurns(groupTurns(parseKakao(request.conversation)))),
      conversation: request.conversation,
    }),
  };
}

export async function analyze(
  request: AnalysisRequest,
  config: AnalyzerConfig,
  systemPrompt: string | undefined,
): Promise<AnalysisResult> {
  const messages = parseKakao(request.conversation);
  const { hints } = deterministicFeatures(selectAnalyzedTurns(groupTurns(messages)));
  const model = createModel(config);
  if (!model || !systemPrompt) return finalizeAnalysisResult({ messages });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await generateText({
        model,
        output: Output.object({ schema: llmOutputSchema }),
        maxRetries: 0,
        reasoning: "low",
        abortSignal: AbortSignal.timeout(20_000),
        ...buildAnalysisPrompt(request, hints, systemPrompt),
      });
      return finalizeAnalysisResult({ messages, judgment: llmOutputSchema.parse(response.output) });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      // Provider/network/schema failures retry once, then deterministic fallback.
      // Log only the error class: schema/provider messages may echo model output.
      console.warn(`LLM analyze attempt ${attempt + 1} failed: ${error.name}`);
    }
  }
  console.error("LLM analyze failed twice; returning deterministic result.");
  return finalizeAnalysisResult({ messages });
}
