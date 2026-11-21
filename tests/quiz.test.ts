import { describe, expect, it } from "vitest";
import { typeCodes } from "../lib/core/classification";
import { letterDistance, quizOptions } from "../lib/core/quiz";

const seeds = ["WzIsIk9CQ0ciLDcyXQ.abc", "token-b", "", "한글 시드"];

describe("quizOptions", () => {
  it.each(typeCodes)("유형 %s는 정답을 포함한 서로 다른 4개 보기를 만든다", (code) => {
    for (const seed of seeds) {
      const options = quizOptions(code, seed);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(code);
    }
  });

  it.each(typeCodes)("유형 %s의 오답은 정답과 1~2글자만 다르다", (code) => {
    for (const seed of seeds) {
      for (const option of quizOptions(code, seed).filter((value) => value !== code)) {
        expect([1, 2]).toContain(letterDistance(code, option));
      }
    }
  });

  it("같은 입력이면 보기 구성과 순서가 같다", () => {
    for (const code of typeCodes) {
      expect(quizOptions(code, "same-token")).toEqual(quizOptions(code, "same-token"));
    }
  });

  it("시드가 달라지면 보기 구성이나 순서가 달라진다", () => {
    const variants = new Set(
      Array.from({ length: 20 }, (_, index) => quizOptions("OBCG", `token-${index}`).join()),
    );
    expect(variants.size).toBeGreaterThan(1);
  });
});
