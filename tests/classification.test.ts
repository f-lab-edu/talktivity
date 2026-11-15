import { describe, expect, it } from "vitest";
import {
  axisIds,
  axisPoles,
  canonicalBadges,
  classifyConfidence,
  classifyConversation,
  colorRawScore,
  countHints,
  deriveLetter,
  deriveTypeCode,
  deterministicFeatures,
  displayScore,
  groupTurns,
  hasEmojiBadge,
  isBoundary,
  lengthRawScore,
  normalizeAnalyzedText,
  selectAnalyzedTurns,
  typeCodes,
} from "../lib/core/classification";
import { parseKakao } from "../lib/core/parse-kakao";

const turns = (...texts: readonly string[]) => texts.map((text) => ({ speaker: "나", text }));
const obcg = "나: 혹시 보자? 😊😊\n상대: 네\n나: 같이 갈까? 😊😊";
const rbmd = "나: 응 할게\n상대: 네\n나: 네 갈게";

describe("분석 턴", () => {
  it("연속 화자만 묶고 나의 분리된 턴을 보존한다", () => {
    const grouped = groupTurns(parseKakao("나: 하나\n나: 둘\n상대: 셋\n나: 넷"));
    expect(grouped).toEqual([
      { speaker: "나", text: "하나\n둘" },
      { speaker: "상대", text: "셋" },
      { speaker: "나", text: "넷" },
    ]);
    expect(selectAnalyzedTurns(grouped)).toEqual([grouped[0], grouped[2]]);
  });
  it.each(["상대: 안녕\n상대: 반가워", "민수: 안녕\n지수: 반가워", "안녕\n반가워"])(
    "명시적인 나가 없으면 전체 대화를 사용한다: %s",
    (text) => {
      const grouped = groupTurns(parseKakao(text));
      expect(selectAnalyzedTurns(grouped)).toEqual(grouped);
    },
  );
  it("유니코드와 공백을 정규화한다", () => {
    expect(normalizeAnalyzedText("  가\n \t 나  ")).toBe("가 나");
  });
});

describe("결정적 피처", () => {
  it.each([
    [[], 50],
    [["가".repeat(24)], 48],
    [["가".repeat(25)], 50],
    [["가".repeat(26)], 52],
    [["가".repeat(100)], 100],
    [["가".repeat(10), "가".repeat(40)], 50],
    [["가".repeat(5), "가".repeat(30), "가".repeat(100)], 60],
    [["가나다 😊 [이모티콘] ㅋㅋ ㅎㅎ ㅠㅠ ㅜㅜ !! ?! ~~ 헐 대박"], 6],
    [["헐"], 0],
  ])("표현을 뺀 중앙 글자 수로 L/B를 계산한다", (texts, expected) => {
    expect(lengthRawScore(turns(...texts))).toBe(expected);
  });
  it.each([
    [[], 50],
    [["평문"], 0],
    [["ㅋㅋ", "평문"], 25],
    [["ㅋㅋ"], 50],
    [["헐"], 50],
    [["ㅋㅋ 헐"], 100],
    [["ㅋㅋ 헐 !!"], 100],
    [["👨‍👩‍👧‍👦 👍🏽 🇰🇷 1️⃣ [이모티콘]", "평문", "평문", "평문", "평문"], 50],
  ])("턴당 표현 토큰 수로 C/M을 계산한다", (texts, expected) => {
    expect(colorRawScore(turns(...texts))).toBe(expected);
  });
  it("힌트 매치 총수와 혼합 신호 비율을 계산한다", () => {
    const result = deterministicFeatures(turns("보자? 응 할게 혹시 같아 아무거나"));
    expect(result.hints).toEqual({
      question: 1,
      proposal: 1,
      reaction: 1,
      assertion: 1,
      softener: 1,
      delegation: 1,
      cushion: 1,
    });
    expect(result.evidence).toEqual({ direction: 3, length: 1, color: 1, stance: 4 });
    expect(result.rawScores).toMatchObject({ direction: 67, stance: 25 });
  });
  it("신호가 없으면 의미 축 raw를 50으로 둔다", () => {
    expect(deterministicFeatures(turns("책상")).rawScores).toMatchObject({
      direction: 50,
      stance: 50,
    });
    expect(Object.values(countHints(turns("책상")))).toEqual(Array(7).fill(0));
  });
});

describe("점수와 유형", () => {
  it("축 조합 전체에 서로 다른 16개 코드를 제공한다", () => {
    expect(typeCodes).toHaveLength(16);
    expect(new Set(typeCodes).size).toBe(16);
  });
  it.each([
    [49, 1, 49, "R"],
    [51, 1, 51, "O"],
    [50, 3, 50, "O"],
    [80, 4, 65, "O"],
    [0, 4, 25, "R"],
    [100, 4, 75, "O"],
  ] as const)("raw %i n %i의 수축값과 방향을 보존한다", (rawScore, n, expected, letter) => {
    expect(displayScore(rawScore, n)).toBe(expected);
    expect(deriveLetter("direction", { rawScore, n }, "입력")).toBe(letter);
  });
  it.each(typeCodes)("관측 점수에서 %s 조합을 파생한다", (code) => {
    const axes = {
      direction: { rawScore: code[0] === "O" ? 80 : 20, n: 4 },
      length: { rawScore: code[1] === "L" ? 80 : 20, n: 4 },
      color: { rawScore: code[2] === "C" ? 80 : 20, n: 4 },
      stance: { rawScore: code[3] === "D" ? 80 : 20, n: 4 },
    };
    expect(deriveTypeCode(axes, "대화")).toBe(code);
  });
  it.each([
    ["direction", "", "O"],
    ["length", "", "B"],
    ["color", "", "C"],
    ["stance", "", "G"],
    ["direction", "a", "R"],
    ["length", "a", "L"],
    ["color", "a", "M"],
    ["stance", "a", "D"],
    ["direction", "가", "O"],
    ["length", "가", "B"],
    ["color", "가", "C"],
    ["stance", "가", "G"],
  ] as const)("근거 0 해시를 축 %s 입력 %s에 고정한다", (axis, text, expected) => {
    expect(deriveLetter(axis, { rawScore: 50, n: 0 }, text)).toBe(expected);
    expect(displayScore(50, 0)).toBe(50);
  });
  it.each([49, 50, 51])("근거가 있으면 해시 입력과 무관하다: %i", (rawScore) => {
    const actual = ["", "a", "다른 입력"].map((text) =>
      deriveLetter("direction", { rawScore, n: 1 }, text),
    );
    expect(actual).toEqual(Array(3).fill(rawScore < 50 ? "R" : "O"));
  });
  it.each([
    [44, false],
    [45, true],
    [50, true],
    [55, true],
    [56, false],
  ] as const)("표시 점수 %i의 경계형 여부를 판정한다", (score, expected) => {
    expect(isBoundary(score)).toBe(expected);
  });
});

describe("신뢰도와 배지", () => {
  it.each([
    [0, 0, 0, "low"],
    [1, 4, 4, "low"],
    [2, 4, 4, "low"],
    [5, 1, 4, "low"],
    [5, 4, 1, "low"],
    [3, 4, 4, "medium"],
    [4, 4, 4, "medium"],
    [5, 2, 4, "medium"],
    [5, 4, 3, "medium"],
    [5, 4, 4, "high"],
  ] as const)("턴 %i 방향 근거 %i 태도 근거 %i의 신뢰도", (size, d, s, expected) => {
    expect(classifyConfidence(size, { direction: d, stance: s, length: 5, color: 5 })).toEqual({
      confidence: expected,
      sampleSize: size,
    });
  });
  it.each([
    [[], false],
    [["ㅋㅋ 헐"], false],
    [["😊", "평문", "평문"], false],
    [["😊", "평문"], true],
    [["😊😊", "평문", "평문"], true],
    [["[이모티콘]", "평문"], true],
    [["👨‍👩‍👧‍👦", "평문", "평문"], false],
  ])("실제 이모지 개수 또는 등장 턴 비율로 배지를 부여한다", (texts, expected) => {
    expect(hasEmojiBadge(turns(...texts))).toBe(expected);
  });
  it("중복을 제거하고 배지를 정규 순서로 반환한다", () => {
    expect(canonicalBadges(["emoji", "comedian", "emoji"])).toEqual(["comedian", "emoji"]);
  });
});

describe("분류 진입점", () => {
  it.each([
    [obcg, "OBCG"],
    [rbmd, "RBMD"],
  ] as const)("대표 대화에서 %s의 유형을 결정한다", (text, expected) => {
    expect(classifyConversation(parseKakao(text)).typeCode).toBe(expected);
  });
  it("LLM은 의미 축만 바꾸고 배지는 코드와 전달된 유머 판정으로 만든다", () => {
    const result = classifyConversation(parseKakao(obcg), { direction: 20, stance: 80 }, true);
    expect(result).toMatchObject({
      typeCode: "RBCD",
      axes: { direction: 35, length: 37, color: 67, stance: 60 },
      confidence: "low",
      sampleSize: 2,
      badges: ["comedian", "emoji"],
      evidence: { direction: 4, length: 2, color: 2, stance: 2 },
    });
  });
  it.each(["", "나:\n상대: 보자? 할게 😊😊", "나:  \t\n상대: 보자? 할게 😊😊"])(
    "나의 내용이 없으면 상대의 근거와 LLM 점수를 사용하지 않는다: %j",
    (text) => {
      const result = classifyConversation(parseKakao(text), { direction: 99, stance: 1 });
      expect(result).toMatchObject({
        typeCode: "OBCG",
        axes: { direction: 50, length: 50, color: 50, stance: 50 },
        evidence: { direction: 0, length: 0, color: 0, stance: 0 },
        sampleSize: 0,
        badges: [],
      });
    },
  );
  it.each(["", " \n\t", "상대: 확인", "나: 😊😊", `나: ${"가".repeat(100000)}`])(
    "극단 입력도 유한한 정수와 재현 가능한 코드를 반환한다: %.20s",
    (text) => {
      const messages = parseKakao(text);
      const result = classifyConversation(messages);
      expect(classifyConversation(messages)).toEqual(result);
      expect(typeCodes).toContain(result.typeCode);
      for (const [index, axis] of axisIds.entries()) {
        const score = result.axes[axis];
        expect(Number.isInteger(score) && score >= 0 && score <= 100).toBe(true);
        if (score !== 50) {
          expect(result.typeCode[index]).toBe(axisPoles[axis][score > 50 ? 0 : 1]);
        }
      }
    },
  );
  it("분석에서 상대의 표현과 의미 힌트를 제외한다", () => {
    const result = classifyConversation(parseKakao("나: 책상\n상대: 보자? 할게 😊😊"));
    expect(result).toMatchObject({
      sampleSize: 1,
      badges: [],
      evidence: { direction: 0, length: 1, color: 1, stance: 0 },
      axes: { direction: 50, length: 41, color: 40, stance: 50 },
    });
  });
});
