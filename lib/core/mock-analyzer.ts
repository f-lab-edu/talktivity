import { characterIds, characters } from "./characters";
import type { AnalysisRequest, AnalysisResult } from "./schema";

export function mockAnalyze(request: AnalysisRequest): AnalysisResult {
  let hash = 2166136261;
  for (const char of `${request.relationship}:${request.conversation}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  const id = characterIds[hash % characterIds.length] ?? "flirt";
  const character = characters[id];
  return {
    characterId: id,
    roastLines: [
      `${character.name} 모드, 오늘도 정상 작동 중.`,
      "아무렇지 않은 척해도 답장 알림은 누구보다 빠르게 확인.",
      "대화의 기술은 만렙, 솔직한 한마디는 아직 연습 중!",
    ],
    stats: { initiative: hash % 101, replyPsychology: (hash >>> 8) % 101, pushPull: (hash >>> 16) % 101 },
    reading: {
      loveFortune: `${request.relationship} 사이에서는 작은 관심이 큰 대화를 만들어요. 지금은 멋진 한마디보다 솔직한 안부가 잘 통하는 시기예요. 상대의 속도에 맞춰 여유 있게 이어가 보세요.`,
      tips: ["질문은 한 번에 하나씩 건네 보세요.", "상대가 말한 작은 취향을 기억해 주세요.", "답장 속도보다 대화의 온도에 집중해 보세요."],
      recommendedLines: ["아까 말한 그거, 어떻게 됐어? 궁금해서!", "오늘 이런 일이 있었는데 네 생각이 났어."],
    },
  };
}
