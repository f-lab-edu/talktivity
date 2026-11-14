import type { AnalysisResult } from "./schema";

export const exampleConversation =
  "나: 오늘 뭐 해? 맛있는 거 먹으러 갈래?\n친구: 좋아! 어디 가고 싶은데?\n나: 네가 좋아하는 파스타집 어때?\n친구: 내 취향 기억하고 있었네 ㅋㅋ";
export const exampleResult: AnalysisResult = {
  characterId: "flirt",
  roastLines: [
    "파스타 약속인 척, 사실은 플러팅 예약.",
    "상대 취향 기억력만큼은 검색 엔진급.",
    "친절과 설렘의 경계에서 오늘도 줄타기 중!",
  ],
  stats: { initiative: 82, replyPsychology: 67, pushPull: 43 },
  reading: {
    loveFortune:
      "가벼운 안부에도 관심이 묻어나는 스타일이에요. 기억해 둔 작은 취향이 관계를 한 걸음 가깝게 만들어요. 다음에는 내 취향도 슬쩍 공유해 보세요.",
    tips: [
      "상대 취향만큼 내 취향도 알려 주세요.",
      "농담 뒤에 진심 한 스푼을 더해 보세요.",
      "답하기 쉬운 질문으로 마무리해 보세요.",
    ],
    recommendedLines: [
      "이번엔 내가 좋아하는 곳도 같이 가 볼래?",
      "너랑 얘기하니까 오늘 하루가 좀 재밌어졌어.",
    ],
  },
};
