import { generateText, Output } from "ai";
import { z } from "zod";
import { type AnalyzerConfig, createModel } from "../analyzer";
import { parseKakao } from "../parse-kakao";
import type { AnalysisRequest } from "../schema";

const text = z.string().min(1);
export const paidReportSchema = z
  .object({
    headline: text.max(60),
    partnerMind: z
      .object({
        summary: text.max(400).refine((value) => {
          const count = [...new Intl.Segmenter("ko", { granularity: "sentence" }).segment(value)]
            .length;
          return count >= 2 && count <= 4;
        }, "요약은 2~4문장이어야 해요."),
        signals: z.array(text.max(80)).length(3),
        cautions: z.array(text.max(80)).min(1).max(2),
      })
      .strict(),
    replies: z.array(z.object({ line: text.max(120), intent: text.max(60) }).strict()).length(3),
    nextStep: text.max(120),
  })
  .strict();
export type PaidReport = z.infer<typeof paidReportSchema>;

export function buildReportPrompt(request: AnalysisRequest, systemPrompt: string) {
  return {
    system: systemPrompt,
    prompt: JSON.stringify({
      relationship: request.relationship,
      conversation: request.conversation,
    }),
  };
}

export function mockPaidReport(request: AnalysisRequest): PaidReport {
  const messages = parseKakao(request.conversation);
  const questions = messages.filter((message) => /[?？]/.test(message.text)).length;
  return {
    headline: `${request.relationship} 사이, 부담 없는 다음 한마디`,
    partnerMind: {
      summary:
        "대화에 나타난 반응만으로 상대의 마음을 단정하기는 어려워요. 열린 질문으로 관심사를 확인하고 편안하게 이어 가 보세요.",
      signals: [
        `관측한 메시지는 ${messages.length}개예요.`,
        `질문 표현이 포함된 메시지는 ${questions}개예요.`,
        `${request.relationship} 관계의 맥락으로 대화를 살펴봤어요.`,
      ],
      cautions: [
        "짧은 대화만으로 의도를 확정할 수 없어요.",
        "답장 속도와 시간대는 판단 근거에 넣지 않았어요.",
      ],
    },
    replies: [
      {
        line: "그 얘기 조금 더 듣고 싶어. 어떤 점이 좋았어?",
        intent: "상대가 편하게 이야기를 이어 가도록 질문해요.",
      },
      {
        line: "나는 이렇게 느꼈어. 너는 어땠어?",
        intent: "내 감정을 먼저 전하고 상대의 관점을 물어요.",
      },
      {
        line: "괜찮으면 다음에 같이 이야기해 보자.",
        intent: "거절할 여지를 두고 가볍게 제안해요.",
      },
    ],
    nextStep: questions
      ? "한 가지 질문에 대한 상대의 답을 차분히 들어 보세요."
      : "상대가 편히 답할 수 있는 열린 질문 하나를 건네 보세요.",
  };
}

export async function generatePaidReport(
  request: AnalysisRequest,
  config: AnalyzerConfig,
  systemPrompt: string | undefined,
): Promise<PaidReport> {
  const model = createModel(config);
  if (!model || !systemPrompt) return mockPaidReport(request);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await generateText({
        model,
        output: Output.object({ schema: paidReportSchema }),
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(20_000),
        ...buildReportPrompt(request, systemPrompt),
      });
      return paidReportSchema.parse(response.output);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      console.warn(`LLM report attempt ${attempt + 1} failed: ${error.name}`);
    }
  }
  return mockPaidReport(request);
}
