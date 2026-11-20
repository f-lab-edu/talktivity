import { z } from "zod";

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
