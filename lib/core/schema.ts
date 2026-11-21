import { z } from "zod";
import {
  axisIds,
  axisPoles,
  badgeIds,
  type Confidence,
  canonicalBadges,
  typeCodes,
} from "./classification";

export const primaryRelationships = ["썸", "연인", "친구", "소개팅"] as const;
export const moreRelationships = [
  "짝사랑",
  "전 애인",
  "직장 동료",
  "상사",
  "동기·선후배",
  "가족",
  "단톡방 지인",
] as const;
export const relationshipPresets = [...primaryRelationships, ...moreRelationships] as const;

export function relationshipAnalyticsValue(
  value: string,
): (typeof relationshipPresets)[number] | "custom" {
  return relationshipPresets.find((preset) => preset === value) ?? "custom";
}

export const conversationSchema = z
  .string({ error: "대화를 입력해 주세요." })
  .min(10, "대화를 10자 이상 입력해 주세요.")
  .max(1500, "대화는 1,500자까지 입력할 수 있어요.")
  .regex(/\S[^\r\n]*\r?\n[\s\S]*\S/, "비어 있지 않은 대화를 두 줄 이상 입력해 주세요.");
export const requestSchema = z
  .object({
    conversation: conversationSchema,
    relationship: z
      .string({ error: "관계를 선택해 주세요." })
      .regex(/^[^\r\n]*$/, "관계는 한 줄로 입력해 주세요.")
      .trim()
      .min(1, "관계를 선택해 주세요.")
      .max(20, "관계는 20자까지 입력할 수 있어요."),
    mySpeaker: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
const text = z.string().min(1);
export const axisScoreSchema = z.number().int().min(0).max(100);
export const axisReasonSchema = text.max(80);
export const roastSchema = z.tuple([text.max(60), text.max(60), text.max(60)]);
export const readingSchema = z
  .object({
    loveFortune: text,
    tips: z.array(text).length(3),
    recommendedLines: z.array(text).min(2).max(3),
  })
  .strict();
export const typeCodeSchema = z.enum(typeCodes);
export const axisScoresSchema = z
  .object({
    direction: axisScoreSchema,
    length: axisScoreSchema,
    color: axisScoreSchema,
    stance: axisScoreSchema,
  })
  .strict();
export const axisReasonsSchema = z
  .object({
    direction: axisReasonSchema,
    length: axisReasonSchema,
    color: axisReasonSchema,
    stance: axisReasonSchema,
  })
  .strict();
export const confidenceSchema = z.enum(["low", "medium", "high"] satisfies Confidence[]);
// canonicalBadges dedupes and orders, so equality rejects duplicates and reversed order.
export const badgeIdsSchema = z
  .array(z.enum(badgeIds))
  .max(badgeIds.length)
  .refine(
    (badges) => canonicalBadges(badges).join() === badges.join(),
    "배지는 중복 없이 comedian, emoji 순서여야 해요.",
  );
export const resultSchema = z
  .object({
    typeCode: typeCodeSchema,
    axes: axisScoresSchema,
    axisReasons: axisReasonsSchema,
    confidence: confidenceSchema,
    sampleSize: z.number().int().min(0),
    badges: badgeIdsSchema,
    roastLines: roastSchema,
    reading: readingSchema,
  })
  .strict()
  .superRefine((result, context) => {
    // Finalizer invariant: a display score off 50 must agree with its type letter.
    axisIds.forEach((axisId, index) => {
      const score = result.axes[axisId];
      const [first, second] = axisPoles[axisId];
      const expected = score > 50 ? first : score < 50 ? second : null;
      if (expected && result.typeCode[index] !== expected) {
        context.addIssue({
          code: "custom",
          path: ["typeCode"],
          message: `${axisId} 점수 ${score}는 ${expected} 글자와 맞아야 해요.`,
        });
      }
    });
  });
export const responseSchema = z.object({ result: resultSchema, shareToken: text });
export const errorSchema = z.object({ error: z.object({ code: text, message: text }) });
export type AnalysisRequest = z.infer<typeof requestSchema>;
export type AnalysisResult = z.infer<typeof resultSchema>;
export type AnalysisResponse = z.infer<typeof responseSchema>;
