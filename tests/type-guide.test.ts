import { describe, expect, it } from "vitest";
import { typeCodes } from "../lib/core/classification";
import { getTypeGuide, typeGroups, typeGuides } from "../lib/core/type-guide";

const forbiddenWords = ["궁합", "호감", "확률", "심리 테스트", "운세"];

describe("유형 도감 데이터", () => {
  it("16개 유형 코드와 가이드 키가 정확히 일치한다", () => {
    expect(Object.keys(typeGuides).sort()).toEqual([...typeCodes].sort());
  });

  it("그룹은 16개 유형을 겹치지 않게 한 번씩 담는다", () => {
    const grouped = typeGroups.flatMap((group) => group.codes);
    expect([...grouped].sort()).toEqual([...typeCodes].sort());
  });

  it.each(typeCodes)("유형 %s의 짝은 유효하고 서로 다르다", (code) => {
    const { goodWith, clashWith } = getTypeGuide(code);
    expect(typeCodes).toContain(goodWith);
    expect(typeCodes).toContain(clashWith);
    expect(goodWith).not.toBe(code);
    expect(clashWith).not.toBe(code);
    expect(goodWith).not.toBe(clashWith);
  });

  it.each(typeCodes)("유형 %s의 문구는 60자 이내이고 금지어가 없다", (code) => {
    const { summary, strength, misread, tip, goodReason, clashReason } = getTypeGuide(code);
    for (const text of [summary, strength, misread, tip, goodReason, clashReason]) {
      expect(text.trim()).not.toBe("");
      expect([...text].length).toBeLessThanOrEqual(60);
      for (const word of forbiddenWords) expect(text).not.toContain(word);
    }
  });
});
