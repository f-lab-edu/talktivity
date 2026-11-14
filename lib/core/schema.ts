import { z } from "zod";
import { characterIds } from "./characters";

export const relationships = ["썸남/썸녀", "연인", "단짝 친구", "회사 동료"] as const;
export const conversationSchema = z
  .string({ error: "대화를 입력해 주세요." })
  .min(10, "대화를 10자 이상 입력해 주세요.")
  .max(1500, "대화는 1,500자까지 입력할 수 있어요.")
  .regex(/\S[^\r\n]*\r?\n[\s\S]*\S/, "비어 있지 않은 대화를 두 줄 이상 입력해 주세요.");
export const requestSchema = z
  .object({
    conversation: conversationSchema,
    relationship: z.enum(relationships, { error: "관계를 선택해 주세요." }),
    mySpeaker: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
const text = z.string().min(1);
export const roastSchema = z.tuple([text.max(60), text.max(60), text.max(60)]);
export const statsSchema = z
  .object({
    initiative: z.number().int().min(0).max(100),
    replyPsychology: z.number().int().min(0).max(100),
    pushPull: z.number().int().min(0).max(100),
  })
  .strict();
export const resultSchema = z
  .object({
    characterId: z.enum(characterIds),
    roastLines: roastSchema,
    stats: statsSchema,
    reading: z
      .object({
        loveFortune: text,
        tips: z.array(text).length(3),
        recommendedLines: z.array(text).min(2).max(3),
      })
      .strict(),
  })
  .strict();
export const responseSchema = z.object({ result: resultSchema, shareToken: text });
export const errorSchema = z.object({ error: z.object({ code: text, message: text }) });
export type AnalysisRequest = z.infer<typeof requestSchema>;
export type AnalysisResult = z.infer<typeof resultSchema>;
export type AnalysisResponse = z.infer<typeof responseSchema>;
