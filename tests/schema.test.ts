import { describe, expect, it } from "vitest";
import { llmOutputSchema } from "../lib/core/analyzer";
import { resultSchema } from "../lib/core/schema";

const reading = {
  loveFortune: "대화가 가볍게 이어지는 흐름이에요.",
  tips: ["먼저 질문하기", "짧게 반응하기", "약속 제안하기"],
  recommendedLines: ["이번 주말 어때?", "그거 재밌겠다!"],
};
const roastLines = ["먼저 말 거는 건 일등", "답장은 짧게 끊어요", "이모지로 다 말해요"];
const obcg = {
  typeCode: "OBCG",
  axes: { direction: 72, length: 30, color: 81, stance: 40 },
  axisReasons: {
    direction: "질문과 제안이 많아요.",
    length: "턴이 짧아요.",
    color: "이모지가 자주 나와요.",
    stance: "완곡한 표현이 많아요.",
  },
  confidence: "high",
  sampleSize: 6,
  badges: ["comedian", "emoji"],
  roastLines,
  reading,
};
const llmOutput = {
  direction: { score: 70, reason: "질문이 많아요." },
  stance: { score: 35, reason: "완곡한 표현을 써요." },
  comedian: true,
  roastLines,
  reading,
};

describe("최종 분석 결과 계약", () => {
  it.each([
    obcg,
    { ...obcg, badges: [], confidence: "low", sampleSize: 0 },
    { ...obcg, badges: ["emoji"] },
  ])("유효한 결과를 통과시킨다", (result) => {
    expect(resultSchema.safeParse(result).success).toBe(true);
  });

  it.each([
    ["범위 밖 축 점수", { ...obcg, axes: { ...obcg.axes, color: 101 } }],
    ["음수 축 점수", { ...obcg, axes: { ...obcg.axes, length: -1 } }],
    ["정수가 아닌 축 점수", { ...obcg, axes: { ...obcg.axes, direction: 72.5 } }],
    ["문자열 축 점수", { ...obcg, axes: { ...obcg.axes, direction: "72" } }],
    ["알 수 없는 유형 코드", { ...obcg, typeCode: "XBCG" }],
    ["잘못된 신뢰도", { ...obcg, confidence: "certain" }],
    ["음수 표본 수", { ...obcg, sampleSize: -1 }],
    ["정수가 아닌 표본 수", { ...obcg, sampleSize: 1.5 }],
    ["중복 배지", { ...obcg, badges: ["emoji", "emoji"] }],
    ["역순 배지", { ...obcg, badges: ["emoji", "comedian"] }],
    ["3개 배지", { ...obcg, badges: ["comedian", "emoji", "emoji"] }],
    ["알 수 없는 배지", { ...obcg, badges: ["flirt"] }],
    ["80자 초과 근거", { ...obcg, axisReasons: { ...obcg.axisReasons, stance: "가".repeat(81) } }],
    ["빈 근거", { ...obcg, axisReasons: { ...obcg.axisReasons, length: "" } }],
    ["characterId 필드", { ...obcg, characterId: "flirt" }],
    ["짧은 roastLines", { ...obcg, roastLines: ["a", "b"] }],
    ["팁 개수 부족", { ...obcg, reading: { ...reading, tips: ["하나"] } }],
    ["direction 70과 R", { ...obcg, typeCode: "RBCG" }],
    ["length 30과 L", { ...obcg, typeCode: "OLCG" }],
    ["color 81과 M", { ...obcg, typeCode: "OBMG" }],
    ["stance 40과 D", { ...obcg, typeCode: "OBCD" }],
  ])("%s를 거절한다", (_label, result) => {
    expect(resultSchema.safeParse(result).success).toBe(false);
  });

  it.each(["OBCG", "RLMD"])("점수 50인 축은 두 글자 모두 허용한다: %s", (typeCode) => {
    const axes = { direction: 50, length: 50, color: 50, stance: 50 };
    expect(resultSchema.safeParse({ ...obcg, typeCode, axes }).success).toBe(true);
  });
});

describe("LLM 출력 계약", () => {
  it("의미 판단 필드만 있는 출력을 통과시킨다", () => {
    expect(llmOutputSchema.safeParse(llmOutput).success).toBe(true);
  });

  it.each([
    ["typeCode", { typeCode: "OBCG" }],
    ["character", { character: "flirt" }],
    ["characterId", { characterId: "flirt" }],
    ["length", { length: { score: 30, reason: "짧아요." } }],
    ["color", { color: { score: 80, reason: "이모지가 많아요." } }],
    ["axes", { axes: obcg.axes }],
    ["confidence", { confidence: "high" }],
    ["sampleSize", { sampleSize: 6 }],
    ["badges", { badges: ["emoji"] }],
  ])("코드 소유 키 %s를 거절한다", (_key, extra) => {
    expect(llmOutputSchema.safeParse({ ...llmOutput, ...extra }).success).toBe(false);
  });

  it.each([
    ["문자열 점수", { direction: { score: "70", reason: "질문이 많아요." } }],
    ["범위 밖 점수", { stance: { score: 101, reason: "단정해요." } }],
    ["80자 초과 근거", { direction: { score: 70, reason: "가".repeat(81) } }],
    ["축 안의 추가 키", { stance: { score: 35, reason: "완곡해요.", typeCode: "OBCD" } }],
    ["문자열 comedian", { comedian: "true" }],
  ])("%s를 거절한다", (_label, extra) => {
    expect(llmOutputSchema.safeParse({ ...llmOutput, ...extra }).success).toBe(false);
  });
});
