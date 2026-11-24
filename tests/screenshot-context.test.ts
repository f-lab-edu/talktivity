import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt } from "../lib/core/analyzer";
import { countHints, deterministicFeatures, hasEmojiBadge } from "../lib/core/classification";
import { latestConversationWithinLimit } from "../lib/core/extractor";
import { prepareConversation } from "../lib/core/mask";
import { parseKakao } from "../lib/core/parse-kakao";

const turns = (...texts: readonly string[]) => texts.map((text) => ({ speaker: "나", text }));

describe("캡처 시간 문맥", () => {
  it.each(["11월 23일 오후 3:12", "2026년 11월 23일 오후 3:12", "오후 3:12", "15:12"])(
    "날짜가 선택적인 내보내기 형식에서 화자와 본문을 분리한다: %s",
    (time) => {
      expect(parseKakao(`[나] [${time}] 안녕\n상대: 반가워`)).toEqual([
        { speaker: "나", text: "안녕", time },
        { speaker: "상대", text: "반가워" },
      ]);
    },
  );
  it("시간이 보이는 말풍선에만 접두사를 붙이고 본문 개인정보를 가린다", () => {
    const messages = [
      { speaker: "나", text: "안녕", date: "11월 23일" },
      { speaker: "나", text: "연락처 010-1234-5678", time: "오후 3:12" },
      { speaker: "상대", text: "[사진: 바닷가]", date: "11월 24일", time: "오전 9:05" },
    ];
    expect(latestConversationWithinLimit(messages)).toBe(
      "나: 안녕\n[나] [오후 3:12] 연락처 [전화번호]\n[상대] [11월 24일 오전 9:05] [사진: 바닷가]",
    );
  });
  it.each([
    [{ speaker: "나", text: "가", time: "오후 3:12" }, "[나] [오후 3:12] 가"],
    [
      { speaker: "나", text: "가", date: "11월 23일", time: "오후 3:12" },
      "[나] [11월 23일 오후 3:12] 가",
    ],
  ])("접두사와 줄바꿈까지 포함해 정확히 1,500자에서 자른다", (message, prefix) => {
    const text = "나".repeat(1500 - prefix.length - 5);
    const latest = { speaker: "상대", text };
    expect(latestConversationWithinLimit([message, latest])).toBe(`${prefix}\n상대: ${text}`);
    expect(latestConversationWithinLimit([message, { ...latest, text: `${text}나` }])).toBe(
      `상대: ${text}나`,
    );
  });
  it("화자 선택과 마스킹을 거쳐도 시간과 이미지 설명이 분석 입력에 남는다", () => {
    const conversation = prepareConversation(
      "[민수] [2026년 11월 23일 오후 3:12] 지수야 010-1234-5678\n[지수] [오후 3:14] [이모티콘: 웃는 곰]",
      "민수",
    );
    const { prompt } = buildAnalysisPrompt(
      { conversation, relationship: "친구" },
      countHints([]),
      "test system",
    );
    expect(JSON.parse(prompt).conversation).toBe(
      "[나] [2026년 11월 23일 오후 3:12] 상대야 [전화번호]\n[상대] [오후 3:14] [이모티콘: 웃는 곰]",
    );
  });
});

describe("캡처 이미지 설명의 결정적 계산", () => {
  it.each(["[사진]", "[사진: 바닷가에서 웃는 사람]", "[이모티콘: 웃는 곰]"])(
    "첨부 설명을 글자 수에서 제외한다: %s",
    (attachment) => {
      expect(deterministicFeatures(turns(`안녕 ${attachment}`)).medianLength).toBe(2);
    },
  );
  it("이모티콘 설명 전체를 표현 하나로 세고 색상 축에 반영한다", () => {
    expect(deterministicFeatures(turns("[이모티콘: 웃는 곰 😊 ㅋㅋ 헐]", "평문"))).toMatchObject({
      expressionsPerTurn: 0.5,
      rawScores: { color: 25 },
    });
  });
  it.each([
    [["[이모티콘: 웃는 곰]", "평문"], true],
    [["[이모티콘: 웃는 곰]", "평문", "평문"], false],
    [["[이모티콘: 웃는 곰] [이모티콘: 우는 곰]", "평문", "평문"], true],
    [["[사진: 😊😊 웃는 사람]", "평문"], false],
  ])("설명 문구의 이모지는 배지 개수를 늘리지 않는다", (texts, expected) => {
    expect(hasEmojiBadge(turns(...texts))).toBe(expected);
  });
  it("설명 안의 힌트와 표현을 제외하고 실제 발화의 힌트를 센다", () => {
    expect(
      deterministicFeatures(
        turns("보자? 할게 [사진: 응 아마 ㅋㅋ 😊] [이모티콘: 혹시 아무거나 같아?]"),
      ),
    ).toMatchObject({
      hints: {
        question: 1,
        proposal: 1,
        reaction: 0,
        assertion: 1,
        softener: 0,
        delegation: 0,
        cushion: 0,
      },
      expressionsPerTurn: 1,
    });
  });
});
