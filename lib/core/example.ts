import { finalizeAnalysisResult } from "./assemble";
import { parseKakao } from "./parse-kakao";
import type { AnalysisResult } from "./schema";

export const exampleConversation =
  "나: 오늘 뭐 해? 맛있는 거 먹으러 갈래?\n친구: 좋아! 어디 가고 싶은데?\n나: 네가 좋아하는 파스타집 어때?\n친구: 내 취향 기억하고 있었네 ㅋㅋ";
export const exampleResult: AnalysisResult = finalizeAnalysisResult({
  messages: parseKakao(exampleConversation),
  judgment: {
    direction: { score: 82, reason: "먼저 일정을 묻고 식사 장소까지 제안했어요." },
    stance: { score: 38, reason: "어때? 하고 물으며 상대가 고를 여지를 남겼어요." },
    comedian: false,
    partnerTemperature: {
      level: 4,
      reason: "상대가 장소를 되묻고 취향을 기억한 말에 웃음으로 반응했어요.",
    },
    roastLines: [
      "파스타 약속도 일정도 깔끔하게 한 번에 정리.",
      "용건은 확실하고 취향 기억력은 검색 엔진급.",
      "친절은 담백하게, 약속은 정확하게 잡는 편!",
    ],
    reading: {
      loveFortune:
        "필요한 말은 또렷하게 전하는 시기예요. 기억해 둔 취향을 약속에 자연스럽게 담으면 대화가 편안하게 이어져요. 다음에는 내 취향도 간단히 알려 주세요.",
      tips: [
        "약속 장소와 시간을 간결하게 정해 보세요.",
        "내가 원하는 것도 짧게 덧붙여 보세요.",
        "마지막에 상대가 고를 선택지를 남겨 보세요.",
      ],
      recommendedLines: [
        "그럼 토요일에 파스타 먹으러 가자!",
        "다음엔 내가 좋아하는 곳도 같이 가 보자.",
      ],
    },
  },
});
