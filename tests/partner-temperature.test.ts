import { describe, expect, it } from "vitest";
import { finalizeAnalysisResult } from "../lib/core/assemble";
import { mockAnalyze } from "../lib/core/mock-analyzer";
import type { Message } from "../lib/core/parse-kakao";
import { computePartnerTemperature } from "../lib/core/partner-temperature";
import { sharePayloadFromResult } from "../lib/core/share-token";

const exchange = (text: string): readonly Message[] => [
  { speaker: "나", text: "가".repeat(100) },
  { speaker: "상대", text },
  { speaker: "나", text: "가".repeat(100) },
  { speaker: "상대", text },
];

describe("상대 온도 코드 계산", () => {
  it.each([
    { questions: 0, reactions: 0, length: 99, level: 1 },
    { questions: 0, reactions: 0, length: 100, level: 2 },
    { questions: 0, reactions: 0, length: 101, level: 2 },
    { questions: 1, reactions: 0, length: 99, level: 2 },
    { questions: 1, reactions: 0, length: 100, level: 3 },
    { questions: 1, reactions: 0, length: 101, level: 3 },
    { questions: 2, reactions: 0, length: 99, level: 3 },
    { questions: 2, reactions: 0, length: 100, level: 4 },
    { questions: 2, reactions: 0, length: 101, level: 4 },
    { questions: 2, reactions: 1, length: 99, level: 4 },
    { questions: 2, reactions: 1, length: 100, level: 5 },
    { questions: 2, reactions: 1, length: 101, level: 5 },
  ])(
    "경계에서 $level 단계다: 질문 $questions 반응 $reactions 길이 $length",
    ({ questions, reactions, length, level }) => {
      const prefix = `${"? ".repeat(questions)}${"응 ".repeat(reactions)}`;
      const messages = exchange(prefix + "가".repeat(length - prefix.length));
      expect(computePartnerTemperature(messages)?.level).toBe(level);
    },
  );

  it.each([
    ["질문", [0, 1, 2, 3].map((n) => `${"? ".repeat(n)}가`), [1, 2, 3, 3]],
    ["제안", [0, 1, 2, 3].map((n) => `${"보자 ".repeat(n)}가`), [1, 2, 3, 3]],
    ["리액션", [0, 1, 2, 3].map((n) => `${"응 ".repeat(n)}가`), [1, 2, 3, 3]],
    ["감탄", [0, 1, 2, 3].map((n) => `${"😊 ".repeat(n)}가`), [1, 2, 3, 3]],
    ["길이", [1, 99, 100, 199, 200, 300].map((n) => "가".repeat(n)), [1, 1, 2, 2, 3, 3]],
  ])("%s 신호는 상한까지 단조롭게 증가한다", (_signal, texts, expected) => {
    expect(texts.map((text) => computePartnerTemperature(exchange(text))?.level)).toEqual(expected);
  });

  it.each(
    [
      [],
      [
        { speaker: null, text: "보자?" },
        { speaker: null, text: "응 😊" },
      ],
      [
        { speaker: "나", text: "보자?" },
        { speaker: "상대", text: "응" },
      ],
      [
        { speaker: "상대", text: "보자?" },
        { speaker: "상대", text: "응 😊" },
      ],
    ].map((messages: readonly Message[]) => ({ messages })),
  )("묶인 상대 턴이 두 개 미만이면 생략한다: %j", ({ messages }) => {
    expect(computePartnerTemperature(messages)).toBeUndefined();
    expect(finalizeAnalysisResult({ messages })).not.toHaveProperty("partnerTemperature");
  });

  it("내 턴과 익명 턴을 상대 힌트에서 제외하고 집계만 근거로 반환한다", () => {
    const result = computePartnerTemperature([
      { speaker: null, text: "보자? 응 😊 비밀원문" },
      { speaker: "나", text: "보자? 응 😊" },
      { speaker: "친구", text: "보자? 응 😊" },
      { speaker: "나", text: "보자? 응 😊" },
      { speaker: "친구", text: "보자? 응 😊" },
    ]);
    expect(result).toEqual({
      level: 5,
      reason: "상대가 질문·제안 4회, 리액션 2회, 감탄 표현 2회를 보였어요.",
      source: "code",
    });
  });

  it.each(["", "😊"])("내 길이가 0일 때도 유한한 단계로 계산한다: %s", (text) => {
    const messages = exchange("가").map((turn) =>
      turn.speaker === "나" ? { ...turn, text } : turn,
    );
    expect(computePartnerTemperature(messages)?.level).toBe(2);
  });

  it("내 턴이 없어도 이름 있는 상대 턴만 계산한다", () => {
    expect(
      computePartnerTemperature([
        { speaker: "친구1", text: "가" },
        { speaker: "친구2", text: "가" },
      ])?.level,
    ).toBe(2);
  });

  it("판단이 없으면 모의 분석과 조립 모두 코드 출처를 쓰고 공유에서는 제외한다", () => {
    const result = mockAnalyze({
      conversation: "나: 안녕\n상대: 보자?\n나: 그래\n상대: 응 😊",
      relationship: "친구",
    });
    expect(result.partnerTemperature?.source).toBe("code");
    expect(sharePayloadFromResult(result)).not.toHaveProperty("partnerTemperature");
  });
});
