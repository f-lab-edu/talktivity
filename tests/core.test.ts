import { describe, expect, it } from "vitest";
import { analyze } from "../lib/core/analyzer";
import { exampleResult } from "../lib/core/example";
import { extractConversation, latestConversationWithinLimit } from "../lib/core/extractor";
import { maskPII, prepareConversation } from "../lib/core/mask";
import { mockAnalyze } from "../lib/core/mock-analyzer";
import { parseKakao, speakersIn } from "../lib/core/parse-kakao";
import { requestSchema, resultSchema } from "../lib/core/schema";

describe("대화 파서", () => {
  it.each([
    [
      "[민수] [오후 3:12] 안녕\n[지수] [오후 3:13] 반가워",
      [
        { speaker: "민수", text: "안녕" },
        { speaker: "지수", text: "반가워" },
      ],
    ],
    [
      "2026년 11월 14일 오후 3:12, 민수 : 안녕\n2026년 11월 14일 오후 3:13, 지수 : 반가워",
      [
        { speaker: "민수", text: "안녕" },
        { speaker: "지수", text: "반가워" },
      ],
    ],
    [
      "민수:안녕\n지수: 반가워",
      [
        { speaker: "민수", text: "안녕" },
        { speaker: "지수", text: "반가워" },
      ],
    ],
    [
      "첫 문장\n민수: 안녕\n다음 줄\n\n지수: 반가워",
      [
        { speaker: null, text: "첫 문장" },
        { speaker: "민수", text: "안녕\n다음 줄" },
        { speaker: "지수", text: "반가워" },
      ],
    ],
    ["https://example.com\n어때?", [{ speaker: null, text: "https://example.com\n어때?" }]],
  ])("복사 형식에서 화자와 이어지는 내용을 보존한다: %s", (input, expected) => {
    expect(parseKakao(input)).toEqual(expected);
  });
  it("화자 칩은 중복 없이 등장 순서로 만든다", () => {
    expect(speakersIn("민수: 안녕\n지수: 반가워\n민수: 뭐 해?")).toEqual(["민수", "지수"]);
  });
});

describe("개인정보 마스킹", () => {
  it.each([
    ["010-1234-5678 / 01012345678 / +82 10 1234 5678", "[전화번호] / [전화번호] / [전화번호]"],
    ["02-123-4567 / 031-1234-5678", "[전화번호] / [전화번호]"],
    ["hello+test@example.co.kr", "[이메일]"],
    ["https://example.com/a?b=1 www.example.com", "[링크] [링크]"],
    ["계좌 123-456-789012 송금", "계좌 [계좌번호] 송금"],
    ["내일 3시에 보자", "내일 3시에 보자"],
  ])("개인정보만 제거한다: %s", (input, expected) => {
    expect(maskPII(input)).toBe(expected);
  });
  it("선택한 화자를 나로 바꾸고 본문의 실제 이름도 제거한다", () => {
    const output = prepareConversation(
      "민수: 지수야 010-1234-5678로 연락해\n지수: 민수야 알겠어",
      "민수",
    );
    expect(output).toBe("나: 상대야 [전화번호]로 연락해\n상대: 나야 알겠어");
  });
  it("이미 가린 대화를 다시 처리해도 개인정보가 복원되지 않는다", () => {
    const output = prepareConversation("나: 연락처 [전화번호]\n상대: 확인했어", "나");
    expect(output).toBe("나: 연락처 [전화번호]\n상대: 확인했어");
  });
});

describe("입력 및 결과 계약", () => {
  it.each([
    ["안녕하세요\n반가워요", true],
    [`${"a".repeat(1498)}\nb`, true],
    [`${"a".repeat(1499)}\nb`, false],
    ["짧아\n요", false],
    ["한 줄로 길게 쓰는 대화입니다", false],
    ["   \n안녕하세요 반가워요\n   ", false],
  ])("문자 수와 두 줄 경계를 검증한다", (conversation, success) => {
    expect(requestSchema.safeParse({ conversation, relationship: "연인" }).success).toBe(success);
  });
  it("허용되지 않은 관계를 거절한다", () => {
    expect(
      requestSchema.safeParse({ conversation: "안녕하세요\n반가워요", relationship: "모르는 사이" })
        .success,
    ).toBe(false);
  });
  it.each([
    { ...exampleResult, characterId: "flirt" },
    { ...exampleResult, roastLines: ["a", "b"] },
    { ...exampleResult, roastLines: ["a".repeat(61), "b", "c"] },
    { ...exampleResult, axes: { ...exampleResult.axes, length: 101 } },
    { ...exampleResult, axes: { ...exampleResult.axes, length: 0.5 } },
    { ...exampleResult, reading: { ...exampleResult.reading, tips: ["하나"] } },
  ])("잘못된 분석 결과를 거절한다", (result) => {
    expect(resultSchema.safeParse(exampleResult).success).toBe(true);
    expect(resultSchema.safeParse(result).success).toBe(false);
  });
});

describe("분석기", () => {
  const request = {
    conversation: "나: 오늘 뭐 해?\n상대: 나 오늘 쉬어",
    relationship: "연인",
  } as const;
  it("같은 입력은 유효하고 바이트까지 동일한 모의 결과를 만든다", () => {
    const result = mockAnalyze(request);
    expect(resultSchema.safeParse(result).success).toBe(true);
    expect(JSON.stringify(mockAnalyze({ ...request }))).toBe(JSON.stringify(result));
    expect(result.badges).not.toContain("comedian");
  });
  it.each([
    [
      "나: 응\n상대: 뭐 해\n나: 네",
      "나: 오늘 점심은 회사 근처 새로 생긴 국수집에서 먹었어\n상대: 오\n나: 저녁은 집에서 천천히 만들어 먹을 생각이야",
      1,
    ],
    [
      "나: 응 알았어\n상대: 뭐 해\n나: 그래 좋아",
      "나: 응 알았어 ㅋㅋㅋ 😊\n상대: 뭐 해\n나: 그래 좋아!! 😊",
      2,
    ],
  ] as const)("길이·표현이 다른 입력은 L/B 또는 C/M에 반영한다", (plain, varied, index) => {
    const base = mockAnalyze({ ...request, conversation: plain }).typeCode;
    const changed = mockAnalyze({ ...request, conversation: varied }).typeCode;
    expect(changed[index]).not.toBe(base[index]);
  });
  it.each([{ provider: "mock" }, { provider: "anthropic" }, { provider: "openai" }, {}])(
    "키가 없으면 외부 요청 없이 모의 분석을 한다",
    async (config) => {
      expect(await analyze(request, config)).toEqual(mockAnalyze(request));
    },
  );
});

describe("캡처 추출", () => {
  it("최근 메시지부터 1,500자 안에 들어가는 만큼만 남기고 개인정보를 가린다", () => {
    const old = { speaker: "상대", text: "가".repeat(1000) };
    const recent = [
      { speaker: "나", text: "번호 010-1234-5678 로\n연락해" },
      { speaker: "상대", text: "나".repeat(700) },
    ];
    const conversation = latestConversationWithinLimit([old, ...recent]);
    expect(conversation).toBe(`나: 번호 [전화번호] 로 연락해\n상대: ${"나".repeat(700)}`);
    expect(
      requestSchema.safeParse({ conversation, relationship: "연인", mySpeaker: "나" }).success,
    ).toBe(true);
  });
  it("키가 없으면 외부 요청 없이 나/상대 예시 대화를 돌려준다", async () => {
    const outcome = await extractConversation([], { provider: "mock" });
    expect(outcome.ok && speakersIn(outcome.conversation)).toEqual(["나", "상대"]);
  });
});
